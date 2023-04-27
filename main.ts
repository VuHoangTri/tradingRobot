import fetch from "node-fetch";
import { RequestInit } from "node-fetch";
import { Position, Data, Account } from "./interface";
import _ from 'lodash';

export let data: Data = {
  // close: [],
  // open: [],
  botEnabled: true,
  symbols: [],
  prePosition: [],
}
export let firstGet: boolean[] = [];
export let firstCompare: boolean[] = [];

import { INTERVAL, BINANCEURL } from "./constant"
import { RestClientV5, UnifiedMarginClient } from "bybit-api";
import { comparePosition, convertBinanceFormat, convertWagonFormat, convertByBitFormat } from "./action";
import { getExchangeInfo } from "./bybit";

const account: Account[] = [
  // {
  //   key: 'QXvZHULCw7Lzjw5eqB',
  //   secret: '7EZOTNFfLO64tJhNiMt3AzSC64qv2H19ftH1',
  //   testnet: true,
  // },
  // {
  //   key: 'FUTDWUTKODGDKSWNLV',
  //   secret: 'OOJVCPQYRIMCWYGQNDBHFTIIZKRGEGZZJFGQ',
  //   testnet: true,
  // },
  {
    key: 'CRYDWOZBKFVRRTDOHN',
    secret: 'MLVUFLNGJEBAOYOYXDJGMZPCDGNREQZTMMJS',
    testnet: true,
  }
];

export const restClient: RestClientV5 = new RestClientV5({
  key: account[0].key,
  secret: account[0].secret,
  testnet: account[0].testnet
});


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
    // await main();
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
  // "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/4854",
  // "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/6260"
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
export const exchangeInfo: any = [];
export async function getCopyList() {
  if (firstGet[0] === true) {
    const result = await getExchangeInfo(client[0]);
    exchangeInfo.push(...result);
  }

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
  // await comparePosition(2, client[2], curPosition[2]);
  for (let i = 0; i < curPosition.length; i++) {
    // console.log(i);
    await comparePosition(i, client[i], curPosition[i])
  }
  // console.log(1);
}