import _ from 'lodash';
import { INTERVAL, LEVERAGEBYBIT, accounts, nodeFetchProxyArr, proxyArr, statusLog, testLev, testOrder, traderAPIs } from "./constant"
import { BybitAPI } from "./bybit";
import { sendNoti } from "./slack";
import { actuator, comparePosition } from "./action";
import { Position } from './interface';


export let bot: { enabled: boolean } = { enabled: true };

function generateNodeFetchProxy() {
  for (const proxy of proxyArr) {
    const proxyParam = proxy.split(":");
    const proxyStr = `http://${proxyParam[2]}:${proxyParam[3]}@${proxyParam[0]}:${proxyParam[1]}`;
    nodeFetchProxyArr.push(proxyStr);
  }
  // console.log(nodeFetchProxyArr.length);
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
    // const sT = new Date().getTime();
    generateNodeFetchProxy();
    accGenAPI();
    const generator = traderGenerator();
    let exchangeInfo;

    // const trader: BybitAPI = generator.next().value;
    // const wallet = await trader.getWalletBalance();
    // console.log(wallet);

    for (let i = 0; i < traderAPIs.length; i++) {
      const trader: BybitAPI = generator.next().value;
      if (i === 0) {
        exchangeInfo = await trader.getExchangeInfo();
      }
      await trader.getAccountByBit();
      trader._exchangeInfo = exchangeInfo || [];

      //################### test unified account
      // if (trader._acc.index === 2) {
      //   // console.log(account);
      //   const apiKeyInfor = await trader.getAPIKeyInfor();
      //   console.log(apiKeyInfor);
      //   await trader.adjustLeverage(testLev);
      //   const price = await trader.getMarkPrice('BTCUSDT');
      //   const priceSize = price.replace(/0+$/g, '');
      //   const decimal = priceSize.toString().split('.')[1]?.length ?? 0;
      //   testOrder.price = price;
      //   testOrder.takeProfit = (Number(price) * 1.0002).toFixed(decimal).toString();
      //   testOrder.stopLoss = (Number(price) * 0.9998).toFixed(decimal).toString();
      //   const response = await trader.createOrder(testOrder);
      //   console.log(response);
      //   break;
      // }
      //#########################################

      const curPos = await trader.getCopyList(true);
      // console.log(curPos);
      if (curPos !== undefined) {
        const position = await trader.getMyPositions();
        // const position = { result: { list: [] } };
        if (position) {
          const myPos = position.result;
          trader._prePos = myPos.list.map((c: Position) => {
            return { symbol: c.symbol, size: c.size, leverage: (Number(c.leverage) * LEVERAGEBYBIT).toString() }
          });
        }
        // console.log(trader._prePos);
        const diffPos = comparePosition({ firstGet: trader._firstGet, curPos: trader._curPos, prePos: trader._prePos });
        // console.log(diffPos);
        const firstDiff: { openPos: Position[], closePos: Position[], adjustPos: Position[] } = {
          openPos: diffPos.openPos
            // ,
            .filter(pos => pos.pnl ? pos.pnl < 0 : false),
          closePos: diffPos.closePos,
          adjustPos: []
        }
        if (firstDiff) {
          await actuator(firstDiff, trader);
        }
        trader._firstGet = false;
        trader._prePos = curPos;
      }
      // console.log(80, trader._prePos);
    }
    console.log(new Date());
    sendNoti("Đã chạy");
    mainExecution(generator);
  } catch (err) {
    sendNoti(`Main error: ${err}`);
    await new Promise((r) => setTimeout(r, 100));
  }
}

export async function mainExecution(generator: Generator<BybitAPI>) {
  try {
    if (bot.enabled) {
      const traderGen = generator.next();
      const trader: BybitAPI = traderGen.value;
      // const sT = new Date().getTime();
      const curPos = await trader.getCopyList(true);
      // const eT = new Date().getTime() - sT;
      // console.log(eT, nodeFetchProxyArr[0]);
      // if (eT > 3000) console.log(nodeFetchProxyArr[0]);
      // console.log(97, curPos);
      if (curPos !== undefined) {
        const diffPos = comparePosition({ firstGet: trader._firstGet, curPos: trader._curPos, prePos: trader._prePos });
        if (diffPos) {
          await actuator(diffPos, trader);
        }
        // console.log(103, trader._acc.index, trader._prePos, curPos);
        trader._prePos = curPos;
      }
      const wallet = await trader.getWalletBalance();
      statusLog.info(`Account ${trader._acc.index}`, wallet);
      if (trader._platform === 'Wagon') { await new Promise((r) => setTimeout(r, 2000)); }
    }
    // count++;
    if (!bot.enabled) {
      await new Promise((r) => setTimeout(r, INTERVAL));
    }
    statusLog.flush();
    await mainExecution(generator);
  } catch (err) {
    sendNoti(`Execution error: ${err}`);
    await new Promise((r) => setTimeout(r, 500));
    await mainExecution(generator);
  }
}
