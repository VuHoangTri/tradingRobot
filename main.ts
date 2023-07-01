import _ from 'lodash';
import { INTERVAL, LEVERAGEBYBIT, accounts, axiosProxyArr, nodeFetchProxyArr, proxyArr, statusLog, testLev, testOrder, traderAPIs } from "./constant"
import { BybitAPI } from "./bybit";
import { sendNoti } from "./slack";
import { actuator, comparePosition } from "./action";
import { Position } from './interface';
import { Axios, AxiosProxyConfig } from 'axios';


export let bot: { enabled: boolean } = { enabled: true };

function generateNodeFetchProxy() {
  for (const proxy of proxyArr) {
    const proxyParam = proxy.split(":");
    const proxyStr = `http://${proxyParam[2]}:${proxyParam[3]}@${proxyParam[0]}:${proxyParam[1]}`;
    nodeFetchProxyArr.push(proxyStr);
    const axiosProxyObject: AxiosProxyConfig = {
      host: proxyParam[0],
      port: Number(proxyParam[1]),
      auth: { username: proxyParam[2], password: proxyParam[3] }, protocol: 'http'
    }
    axiosProxyArr.push(axiosProxyObject);
  }
  // console.log(nodeFetchProxyArr.length);
}

function accGenAPI() {
  for (const account of accounts) {
    // account.nodefetchProxy = nodeFetchProxyArr;
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

async function walletReport() {
  for (const trader of traderAPIs) {
    const wallet = await trader.getWalletBalance();
    statusLog.info(`Account ${trader._acc.index}`, wallet);
  }
  statusLog.flush();
}

export async function main() {
  try {
    // const sT = new Date().getTime();
    generateNodeFetchProxy();
    accGenAPI();
    const generator = traderGenerator();
    let exchangeInfo;
    setInterval(walletReport, 9000)
    // const trader: BybitAPI = generator.next().value;
    // const wallet = await trader.getWalletBalance();
    // console.log(wallet);
    // console.log()
    for (let i = 0; i < traderAPIs.length; i++) {
      const trader: BybitAPI = generator.next().value;
      if (i === 0) {
        exchangeInfo = await trader.getExchangeInfo();
      }
      await trader.getAccountByBit();
      await trader.initial();
      trader._exchangeInfo = exchangeInfo || [];

      //################### test unified account
      // await new Promise((r) => setTimeout(r, INTERVAL));
      // if (trader._acc.index === 5) {
      //   const apiKeyInfor = await trader.getAPIKeyInfor();
      //   const price = await trader.getMarkPrice('BTCUSDT');
      //   const priceSize = price?.replace(/0+$/g, '');
      //   const decimal = priceSize?.toString().split('.')[1]?.length ?? 0;
      //   testOrder.price = price;
      //   testOrder.takeProfit = (Number(price) * 1.0002).toFixed(decimal).toString();
      //   testOrder.stopLoss = (Number(price) * 0.9998).toFixed(decimal).toString();
      //   const response = await trader.createOrder(testOrder);
      //   console.log(response);
      //   break;
      // }
      //#########################################

      const curPos = await trader.getCopyList(true);
      // console.log(trader._acc.index, curPos);
      if (curPos !== undefined) {
        const position = await trader.getMyPositions();
        // console.log(position);
        // const position = { result: { list: [] } };
        if (position) {
          const myPos = position.result;
          trader._prePos = myPos.list.map((c: Position) => {
            return { symbol: c.symbol, size: c.size }
          });
        }
        // console.log(trader._prePos);
        const diffPos = comparePosition({ firstGet: trader._firstGet, curPos: trader._curPos, prePos: trader._prePos });
        // console.log(trader._acc.index, diffPos);
        const firstDiff: { openPos: Position[], closePos: Position[], adjustPos: Position[] } = {
          openPos: diffPos.openPos
            //,
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
    await mainExecution(generator);
  } catch (err) {
    sendNoti(`Main error: ${err}`);
    await new Promise((r) => setTimeout(r, INTERVAL));
    await main();
  }
}

export async function mainExecution(generator: Generator<BybitAPI>) {
  try {
    if (bot.enabled) {
      const traderGen = generator.next();
      const trader: BybitAPI = traderGen.value;
      if (trader._isRun) {
        // const sT = new Date().getTime();
        const curPos = await trader.getCopyList(true);

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
      }
      // count++;
      if (!bot.enabled) {
        await new Promise((r) => setTimeout(r, INTERVAL));
      }
    }
    await mainExecution(generator);
  } catch (err) {
    sendNoti(`Execution error: ${err}`);
    await new Promise((r) => setTimeout(r, INTERVAL));
    await mainExecution(generator);
  }
}
