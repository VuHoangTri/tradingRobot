import _ from 'lodash';
import { INTERVAL, accounts, axiosProxyArr, proxyArr } from "./constant"
import { BybitAPI } from "./bybit";
import { sendError } from "./slack";
import { adjustPosition, closedPosition, comparePosition, openedPosition } from "./action";
import { Position } from './interface';
import { AxiosProxyConfig } from 'axios';

export let bot: { enabled: boolean } = { enabled: true };
export const traderAPIs: BybitAPI[] = [];

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
    const generator = traderGenerator();
    const result = await traderAPIs[0].getExchangeInfo();
    for (let i = 0; i < traderAPIs.length; i++) {
      const trader: BybitAPI = generator.next().value;
      trader._exchangeInfo = [...result]
      const curPos = await trader.getCopyList();
      trader._prePos = curPos;
      // const myPos = (await trader.getMyPositions()).result;//curPos;
      // trader._prePos = myPos.list.map((c: Position) => {
      //   return { symbol: c.symbol, size: c.size, leverage: c.leverage }
      // });
      trader._firstGet = false;
      // console.log(38, trader._curPos, trader._prePos)
    }
    mainExecution(generator)
  } catch (err) {
    sendError(`Main error:${err}`);
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
              cP.symbol === pP.symbol && Number(cP.leverage) !== Number(pP.leverage)
            )
          ) || [];
          if (adjustedLeverage.length > 0) {
            sendError(`Đã chỉnh đòn bẩy`);
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
    sendError(`Execution error: ${err}`);
  }
}