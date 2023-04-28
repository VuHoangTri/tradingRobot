import fetch from "node-fetch";
import { RequestInit } from "node-fetch";
import { Position, Data, Account } from "./interface";
import _ from 'lodash';
import { INTERVAL, BINANCEURL } from "./constant"
import { RestClientV5, UnifiedMarginClient } from "bybit-api";
import { comparePosition, convertBinanceFormat, convertWagonFormat, convertByBitFormat } from "./action";
import { getExchangeInfo, getMyPositions } from "./bybit";

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

export let data: Data = {
  // close: [],
  // open: [],
  botEnabled: true,
  symbols: [],
  prePosition: [],
}
export let firstGet: boolean = true;
export const exchangeInfo: any = [];


export const bybitTrader: string[] = [
  "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=dzzffk%2B%2FqGvNboYCRvY38Q%3D%3D", // remove
  // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=4pjjfgTlpIeWNdTARJUWsQ%3D%3D",
  "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=saPU8WuUYBXXebYMgbRDRw%3D%3D",
  // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=O5k95MOucrVPCGiLNW3Xaw%3D%3D",
  "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=ezDycLoNFTp3Exq0IQhD1g%3D%3D"
];
export const wagonTrader: string[] = [
  // "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/4854",
  "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/6260"
];
export const binanceTrader: { encryptedUid: string; tradeType: string }[] = [
  // {
  //   "encryptedUid": "8FE17CCE0A3EA996ED7D8B538419C826",
  //   "tradeType": "PERPETUAL"
  // }
];
// 227087068C057B808A83125C8E586BB8 "6408AAEEEBF0C76A3D5F0E39C64AAABA" "8FE17CCE0A3EA996ED7D8B538419C826" "EF6C3AABCBE82294A607E8C94633F082"

export async function main() {
  try {

    for (let i = 0; i < wagonTrader.length + binanceTrader.length; i++) {
      data.prePosition.push([])
    }
    const result = await getExchangeInfo(client[0]);
    exchangeInfo.push(...result);
    for (let i = 0; i < data.prePosition.length; i++) {
      if (firstGet) {
        const myPos = await getMyPositions(client[i]);
        if (myPos.retMsg !== 'Success') {
          data.botEnabled = false;
        }
        data.prePosition[i] = myPos.result.list.map((c: Position) => {
          return {
            symbol: c.symbol,
            size: c.size,
            leverage: c.leverage
          }
        });
      }
      const curPosition = await getCopyList();
      // console.log(94, curPosition);
      await comparePosition(i, client[i], curPosition[i]);
    }
    firstGet = false;
    await new Promise((r) => setTimeout(r, 1000));
    await mainExecution();
    // await main();

  } catch (err) {
    console.log(err);
    await new Promise((r) => setTimeout(r, INTERVAL));
    // await main();
  }
}
async function getCopyList() {
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
  }
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
  const length = curPosition.length;
  // console.log(binanceCopyPos.length + count)
  for (let i = length; i < binanceCopyPos.length + length; i++) {
    const list = binanceCopyPos[i - length];
    const response: any = await list.json();
    if (response.success === true && response.code === "000000") {
      const data = await convertBinanceFormat(i, response.data.otherPositionRetList);
      curPosition.push(data);
    }
  }
  return curPosition;
}

export async function mainExecution() {
  if (data.botEnabled) {
    const curPosition = await getCopyList();
    for (let i = 0; i < curPosition.length; i++) {
      await comparePosition(i, client[i], curPosition[i])
    }
    await new Promise((r) => setTimeout(r, INTERVAL));
    // console.log('Next');
    await mainExecution();
    // console.log(1);
  }
}