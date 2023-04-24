import fetch from "node-fetch";
import { RequestInit } from "node-fetch";
import { Position, Data, Account } from "./interface";
import _ from 'lodash';

export const data: Data = {
  // close: [],
  // open: [],
  botEnabled: true,
  symbols: [],
  prePosition: [],
}
export const firstGet: boolean[] = [];
export const firstCompare: boolean[] = [];

import { INTERVAL, BINANCEURL } from "./constant"
import { UnifiedMarginClient } from "bybit-api";
import { comparePosition, convertBinanceFormat, convertWagonFormat, convertByBitFormat } from "./action";


const account: Account[] = [
  {
    key: 'GJJ2ZtB6THPcj5a955',
    secret: 'gxxu2TViRHDqCnbyX85EpGxxBXEOms8nLZfY',
    testnet: true,
  },
  {
    key: 'HFYBKZSZZBDZJPTOEI',
    secret: 'JYRAEITQDHCXAAROKDITFJEGYZXLEPZBVJXC',
    testnet: true,
  },
  {
    key: 'UPLVZFMENNYTYWDDKS',
    secret: 'ZNOBJYKWFMFIYEIICVBHOCBZXVKVACKNQWHB',
    testnet: true,
  }
]
export const client: UnifiedMarginClient[] = [];
for (const acc of account) {
  const newClient = new UnifiedMarginClient(acc);
  client.push(newClient);
}

export async function main() {
  try {
    if (data.botEnabled) {
      await getCopyList();
    }
    // await main();
    await new Promise((r) => setTimeout(r, INTERVAL));
    await main();
  } catch (err) {
    console.log(err);
    await new Promise((r) => setTimeout(r, INTERVAL));
    await main();
  }
}

export const bybitTrader: string[] = [
  "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=dzzffk%2B%2FqGvNboYCRvY38Q%3D%3D", // remove
  // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=4pjjfgTlpIeWNdTARJUWsQ%3D%3D",
  "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=saPU8WuUYBXXebYMgbRDRw%3D%3D",
  // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=O5k95MOucrVPCGiLNW3Xaw%3D%3D",
  "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=ezDycLoNFTp3Exq0IQhD1g%3D%3D"
];
export const wagonTrader: string[] = [
  "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/4854",
  "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/6260"
];
export const binanceTrader: { encryptedUid: string; tradeType: string }[] = [
  {
    "encryptedUid": "8FE17CCE0A3EA996ED7D8B538419C826",
    "tradeType": "PERPETUAL"
  }
];
// 227087068C057B808A83125C8E586BB8 "6408AAEEEBF0C76A3D5F0E39C64AAABA" "8FE17CCE0A3EA996ED7D8B538419C826" "EF6C3AABCBE82294A607E8C94633F082"

// export const copyTrader: string[] =
//   [...wagonTrader, ...binanceTrader]
for (let i = 0; i < wagonTrader.length + binanceTrader.length; i++) {
  data.prePosition.push([])
}
for (let i = 0; i < wagonTrader.length + binanceTrader.length; i++) {
  firstGet.push(true);
}
for (let i = 0; i < wagonTrader.length + binanceTrader.length; i++) {
  firstCompare.push(true);
}

export async function getCopyList() {
  const curPosition: Position[][] = [];
  // const listCopyPos: any = [];
  // for (const trader of bybitTrader) {
  //   listCopyPos.push(await fetch(trader));
  // }
  // for (let i = 0; i < listCopyPos.length; i++) {
  //   // console.log(i, listCopyPos[i]);
  //   const list = listCopyPos[i];
  //   const response: any = await list.json();
  //   if (response.retMsg === 'success' && response.retCode === 0) {
  //     const curPosition: Position[] = await convertByBitFormat(response.result.data);
  //     // console.log(i, curPosition);
  //     await comparePosition(i, client[i], curPosition);
  //   }
  // }
  let count = 0;
  const wagonCopyPos: any = [];
  for (const trader of wagonTrader) {
    wagonCopyPos.push(await fetch(trader));
  }
  for (let i = 0; i < wagonCopyPos.length; i++) {
    const list = wagonCopyPos[i];
    const response: any = await list.json();
    if (response.success === true && response.code === "000000") {
      curPosition.push(await convertWagonFormat(i, response.data));
    }
    count++;
  }
  // console.log(count);
  // count = count - 1;

  // console.log(data.prePosition.length, count);
  const binanceCopyPos: any = [];
  for (const trader of binanceTrader) {
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      redirect: "follow",
      body: JSON.stringify(trader),
    };
    binanceCopyPos.push(await fetch(BINANCEURL, requestOptions));
  }
  // console.log(binanceCopyPos.length + count)
  for (let i = count; i < binanceCopyPos.length + count; i++) {
    const list = binanceCopyPos[i - count];
    const response: any = await list.json();
    if (response.success === true && response.code === "000000") {
      const data = await convertBinanceFormat(i, response.data.otherPositionRetList);
      // console.log(data);
      curPosition.push(data);
      //   await comparePosition(i, client[i], curPosition);
    }
  }
  for (let i = 0; i < curPosition.length; i++) {
    // console.log(i);
    await comparePosition(i, client[i], curPosition[i])
  }
  // console.log(1);
}