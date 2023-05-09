import _ from 'lodash';
import { INTERVAL, LEVERAGEBYBIT, accounts, nodeFetchProxyArr, proxyArr, traderAPIs } from "./constant"
import { BybitAPI } from "./bybit";
import { sendNoti } from "./slack";
import { adjustPosition, closedPosition, comparePosition, openedPosition } from "./action";
import { Position } from './interface';
import { AxiosProxyConfig } from 'axios';

export let bot: { enabled: boolean } = { enabled: true };

function generateNodeFetchProxy() {
  for (const proxy of proxyArr) {
    const proxyParam = proxy.split(":");
    const proxyStr = `http://${proxyParam[2]}:${proxyParam[3]}@${proxyParam[0]}:${proxyParam[1]}`
    // const axiosProxyObj: AxiosProxyConfig = {
    //   host: proxyParam[0],
    //   port: Number(proxyParam[1]),
    //   auth: {
    //     username: proxyParam[2],
    //     password: proxyParam[3]
    //   }
    // }
    nodeFetchProxyArr.push(proxyStr);
  }
}

function accGenAPI() {
  for (const account of accounts) {
    account.nodefetchProxy = nodeFetchProxyArr;
    const initAccount = new BybitAPI(account);
    traderAPIs.push(initAccount);
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
    const sT = new Date().getTime();
    generateNodeFetchProxy();
    accGenAPI();
    await new Promise((r) => setTimeout(r, 500));
    const generator = traderGenerator();
    for (let i = 0; i < traderAPIs.length; i++) {
      const trader: BybitAPI = generator.next().value;
      // trader.initial();
      const result = await trader.getExchangeInfo();
      await trader.getAccountByBit();
      trader._exchangeInfo = result || [];
      // const curPos = await trader.getCopyList();
      // trader._prePos = curPos;

      const position = await trader.getMyPositions()
      console.log(position);
      // if (position) {
      //   const myPos = position.result;//curPos;
      //   trader._prePos = myPos.list.map((c: Position) => {
      //     return { symbol: c.symbol, size: c.size, leverage: (Number(c.leverage) * LEVERAGEBYBIT).toString() }
      //   });
      // }

      // trader._firstGet = false;
      // console.log(62, trader._curPos)
    }
    sendNoti("Đã chạy");
    // mainExecution(generator);
    console.log(73, new Date().getTime() - sT);

  } catch (err) {
    sendNoti(`Main error:${err}`);
    await new Promise((r) => setTimeout(r, INTERVAL));
  }
}

export async function mainExecution(generator: Generator<BybitAPI>) {
  try {
    // const sT = new Date().getTime();
    const traderGen = generator.next();
    const trader: BybitAPI = traderGen.value;
    if (bot.enabled) {
      const curPos = await trader.getCopyList();
      if (curPos !== undefined) {
        const diffStatus = await comparePosition({ firstGet: trader._firstGet, curPos: trader._curPos, prePos: trader._prePos });
        trader._firstGet = false;
        // console.log(diffStatus);
        if (diffStatus) {
          const { openPos, closePos, adjustPos } = diffStatus;

          if (openPos.length > 0) {
            const openPosFine = _.cloneDeep(openPos.filter((c: any) => trader._exchangeInfo.some((x: any) => c.symbol === x.symbol)) || []);

            if (openPosFine.length > 0) {
              await trader.adjustLeverage(openPosFine);
              const batchOpen = openedPosition(openPosFine, trader);
              trader.openBatchOrders(batchOpen, "Open Position");
            }

          }

          if (adjustPos.length > 0 || closePos.length > 0) {
            const myPos = await trader.getMyPositions();

            if (myPos) {
              const myList = myPos?.result.list.map((c: Position) => {
                return { symbol: c.symbol, size: c.size, leverage: (Number(c.leverage) * LEVERAGEBYBIT).toString() }
              });

              if (closePos.length > 0 && myList.length > 0) {
                const closeMyPos = myList.filter(pP =>
                  closePos.some(cP => cP.symbol === pP.symbol)
                ) || [];
                const batchClose = closedPosition(closeMyPos, trader);
                trader.openBatchOrders(batchClose, "Close Position");
              }

              if (adjustPos.length > 0) {
                const adjustedLeverage = adjustPos.filter(pP =>
                  myList.some(cP =>
                    cP.symbol === pP.symbol && Number(cP.leverage) !== (Number(pP.leverage))
                  )
                ) || [];
                if (adjustedLeverage.length > 0) {
                  sendNoti(`Đã chỉnh đòn bẩy ${adjustedLeverage.map(c => c.symbol)}`);
                  await trader.adjustLeverage(adjustedLeverage);
                }
                const adjustMyPost = myList.filter(pP =>
                  adjustPos.some(cP => cP.symbol === pP.symbol)
                ) || [];
                const result = await adjustPosition(adjustMyPost, trader);
                trader.openBatchOrders(result.batch, result.pnl);
              }

            }

          }
        }
        await new Promise((r) => setTimeout(r, INTERVAL));
        trader._prePos = curPos;
      }
      // console.log(new Date().getTime() - sT);
      await mainExecution(generator);
      // console.log(1);
    }
  } catch (err) {
    sendNoti(`Execution error: ${err}`);
  }
}
