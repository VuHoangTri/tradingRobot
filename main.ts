import _ from 'lodash';
import { INTERVAL, LEVERAGEBYBIT, accounts, axiosProxyArr, proxyArr, traderAPIs } from "./constant"
import { BybitAPI } from "./bybit";
import { sendNoti } from "./slack";
import { adjustPosition, closedPosition, comparePosition, openedPosition } from "./action";
import { Position } from './interface';
import { AxiosProxyConfig } from 'axios';

export let bot: { enabled: boolean } = { enabled: true };

function generateAxiosProxy() {
  for (const proxy of proxyArr) {
    const proxyParam = proxy.split(":");
    const axiosProxyObj: AxiosProxyConfig = {
      host: proxyParam[0],
      port: Number(proxyParam[1]),
      auth: {
        username: proxyParam[2],
        password: proxyParam[3]
      }
    }
    axiosProxyArr.push(axiosProxyObj);
  }
}

function accGenAPI() {
  for (const account of accounts) {
    account.axiosProxy = axiosProxyArr;
    traderAPIs.push(new BybitAPI(
      account
    ))
  }
}

function* traderGenerator(): Generator<BybitAPI> {
  let i = 0;
  while (true) {
    yield traderAPIs[i];
    i = (i + 1) % traderAPIs.length;
  }
}

export async function main() {
  try {
    generateAxiosProxy();
    accGenAPI();
    await new Promise((r) => setTimeout(r, 500));
    const generator = traderGenerator();
    for (let i = 0; i < traderAPIs.length; i++) {
      const trader: BybitAPI = generator.next().value;
      const result = await trader.getExchangeInfo();
      trader._exchangeInfo = result || [];
      const curPos = await trader.getCopyList();
//       trader._prePos = curPos;

      const position = await trader.getMyPositions()
      if (position) {
        const myPos = position.result;//curPos;
        trader._prePos = myPos.list.map((c: Position) => {
          return { symbol: c.symbol, size: c.size, leverage: c.leverage }
        });
      }
      
      trader._firstGet = false;
      // console.log(62, trader._curPos, trader._prePos)
    }
    sendNoti("Đã chạy");
    mainExecution(generator)
  } catch (err) {
    sendNoti(`Main error:${err}`);
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

export async function mainExecution(generator: Generator<BybitAPI>) {
  try {
    const traderGen = generator.next();
    const trader: BybitAPI = traderGen.value;
    trader.initial();
    if (bot.enabled) {
      const curPos = await trader.getCopyList();
      const diffStatus = await comparePosition({ firstGet: trader._firstGet, curPos: trader._curPos, prePos: trader._prePos });
      // console.log(diffStatus);
      if (diffStatus) {
        const { openPos, closePos, adjustPos } = diffStatus;
        if (openPos.length > 0) {
          const openPosFine = _.cloneDeep(openPos.filter((c: any) => trader._exchangeInfo.some((x: any) => c.symbol === x.symbol)) || []);
          if (openPosFine.length > 0) {
            await trader.adjustLeverage(openPosFine);
            const batchOpen = openedPosition(openPosFine, trader);
            trader.openBatchOrders(batchOpen, false);
          }
        }
        if (closePos.length > 0) {
          const batchClose = closedPosition(closePos, trader);
          trader.openBatchOrders(batchClose, true);
        }
        if (adjustPos.length > 0) {
          const adjustedLeverage = adjustPos.filter(pP =>
            trader._prePos.some(cP =>
              cP.symbol === pP.symbol && Number(cP.leverage) !== (Number(pP.leverage) / LEVERAGEBYBIT)
            )
          ) || [];
          // console.log(adjustedLeverage);
          if (adjustedLeverage.length > 0) {
            sendNoti(`Đã chỉnh đòn bẩy ${adjustedLeverage.map(c => c.symbol)}`);
            await trader.adjustLeverage(adjustedLeverage);
          }
          const result = await adjustPosition(adjustPos, trader);
          trader.openBatchOrders(result.batch, result.pnl);
        }
      }
      await new Promise((r) => setTimeout(r, INTERVAL));
      trader._prePos = curPos;
      // console.log('Next');
      await mainExecution(generator);
      // console.log(1);
    }
  } catch (err) {
    sendNoti(`Execution error: ${err}`);
  }
}
