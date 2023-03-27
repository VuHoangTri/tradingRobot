import fetch from "node-fetch";
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

import { INTERVAL } from "./constant"
import { UnifiedMarginClient } from "bybit-api";
import { comparePosition, convertByBitFormat } from "./action";


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
    await main();
    await new Promise((r) => setTimeout(r, INTERVAL));
  } catch (err) {
    console.log(err);
    await new Promise((r) => setTimeout(r, INTERVAL));
    await main();
  }
}

export const copyTrader: string[] = [
  "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=dzzffk%2B%2FqGvNboYCRvY38Q%3D%3D", // remove
  // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=4pjjfgTlpIeWNdTARJUWsQ%3D%3D",
  "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=saPU8WuUYBXXebYMgbRDRw%3D%3D",
  // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=O5k95MOucrVPCGiLNW3Xaw%3D%3D",
  "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=ezDycLoNFTp3Exq0IQhD1g%3D%3D"
]

for (let i = 0; i < copyTrader.length; i++) {
  data.prePosition.push([])
}
for (let i = 0; i < copyTrader.length; i++) {
  firstGet.push(true);
}
for (let i = 0; i < copyTrader.length; i++) {
  firstCompare.push(true);
}

export async function getCopyList() {
  const listCopyPos: any = [];
  for (const trader of copyTrader) {
    listCopyPos.push(await fetch(trader));
  }
  for (let i = 0; i < listCopyPos.length; i++) {
    // console.log(i, listCopyPos[i]);
    const list = listCopyPos[i];
    const response: any = await list.json();
    if (response.retMsg === 'success' && response.retCode === 0) {
      const curPosition: Position[] = await convertByBitFormat(response.result.data);
      // console.log(i, curPosition);
      await comparePosition(i, client[i], curPosition);
    }
  }
}

// const isSameTrade = (a: ApiObject, b: ApiObject) =>
//     a.symbol === b.symbol &&
//     a.entryPrice === b.entryPrice &&
//     a.sizeX === b.sizeX &&
//     a.side === b.side &&
//     a.leverageE2 === b.leverageE2;
//   // a.symbol == b.symbol && parseInt(a.entryPrice) == parseInt(b.entryPrice) &&
//   // parseInt(a.sizeX) == parseInt(b.sizeX) && a.side == b.side &&
//   // parseInt(a.leverageE2) == parseInt(b.leverageE2);
//   if (response.retCode === 0 && response.retMsg === "success") {
//     const getUniqueTrades = (left: ApiObject[], right: ApiObject[], compareFunction: (a: ApiObject, b: ApiObject) => boolean): ApiObject[] =>
//       left.filter(
//         (leftValue) =>
//           !right.some((rightValue) => compareFunction(leftValue, rightValue))
//       );
//     if (data.prePosition !== undefined) {
//       const closeList: ApiObject[] = getUniqueTrades(data.prePosition, curPosition, isSameTrade);
//       const openList: ApiObject[] = getUniqueTrades(curPosition, data.prePosition, isSameTrade);
//       if (closeList.length > 0) {
//         const updatedCloseList: ApiObject[] = await Promise.all(await updateList('sell', closeList));
//         data.close.push(...updatedCloseList);
//         convertAndSendBot('close', updatedCloseList);
//       }
//       if (openList.length > 0) {
//         const updatedOpenList: ApiObject[] = await Promise.all(await updateList('buy', openList));
//         // console.log(updatedBuyList);
//         data.open.push(...updatedOpenList);
//         convertAndSendBot('open', updatedOpenList)
//       }
//       data.symbols = closeList.map((c) => c.symbol);
//     }

//     data.prePosition = curPosition;
//     data.prePosition.forEach((c) => {
//       const originalDate = new Date(parseInt(c.createdAtE3));
//       c.createDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
//     });
//   }


// async function updateList(action: string, sellList: ApiObject[]): Promise<ApiObject[]> {
//   const updatedList: ApiObject[] = [];
//   for (const c of sellList) {
//     const originalDate = new Date();
//     c.symbol = c.symbol.match(/[A-Z]/g)?.join('');
//     const markPrice = await getMarkPrice(c.symbol?.toString());
//     if (action === 'sell')
//       c.sellDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
//     else
//       c.buyDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
//     c.markPrice = markPrice;
//     updatedList.push(c);
//   }

//   return updatedList;
// }