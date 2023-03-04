import fetch from "node-fetch";
import { createBatchOrder, createOrder, getAccountByBit, getMarkPrice, getMyPositions, getWalletBalance, setLeverage } from './bybit';
import { sendChatToBot } from "./slack";
import { ApiObject, Order, Position, Data, BatchOrders, Leverage } from "./interface";
import _ from 'lodash';

export const data: Data = {
  close: [],
  open: [],
  botEnabled: true,
  symbols: [],
  prePosition: []
}
import { INTERVAL } from "./constant"
import { comparePosition, convertByBitFormat, convertToOrder } from "./action";

export async function main() {
  try {
    if (data.botEnabled) {
      await getCopyList();
    }
    await new Promise((r) => setTimeout(r, INTERVAL));
    await main();
  } catch (err) {
    console.log(err);
    await new Promise((r) => setTimeout(r, INTERVAL));
    await main();
  }
}


export async function getCopyList() {
  const rs = await fetch(
    "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=3naZZ7hWD7cBntjPDMVwKQ%3D%3D"
    // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=iHPrkzK2zSwirdW3XpjOsg%3D%3D"
  );
  const response: any = await rs.json();
  if (response.retMsg === 'success' && response.retCode === 0) {
    const curPosition: Position[] = convertByBitFormat(response.result.data);
    comparePosition(curPosition);
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