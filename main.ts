import fetch from "node-fetch";
import { getMarkPrice } from './bybit';
import { sendChatToBot } from "./slack";
import _ from 'lodash';

export interface ApiObject {
  symbol: string | undefined;
  entryPrice: string;
  sizeX: string;
  createdAtE3: string;
  side: string;
  leverageE2: string;
  isIsolated: boolean;
  transactTimeE3: string;
  stopLossPrice: string;
  takeProfitPrice: string;
  takeProfitOrderId: string;
  stopLossOrderId: string;
  orderCostE8: string;
  reCalcEntryPrice: string;
  positionEntryPrice: string;
  buyDate: string;
  sellDate: string;
  createDate: string;
  markPrice?: string;
}

interface data {
  close: ApiObject[];
  open: ApiObject[];
  botEnabled: boolean;
  symbols: any[];
  prePosition: ApiObject[]
}
export const data: data = {
  close: [],
  open: [],
  botEnabled: true,
  symbols: [],
  prePosition: []
}
import { INTERVAL } from "./constant"
async function updateList(action: string, sellList: ApiObject[]): Promise<ApiObject[]> {
  const updatedList: ApiObject[] = [];
  for (const c of sellList) {
    const originalDate = new Date();
    c.symbol = c.symbol?.match(/[A-Z]/g)?.join('');
    const markPrice = await getMarkPrice(c.symbol?.toString());
    if (action === 'sell')
      c.sellDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
    else
      c.buyDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
    c.markPrice = markPrice;
    updatedList.push(c);
  }

  return updatedList;
}

export async function getOrderList() {
  const rs = await fetch(
    "https://api2.bybit.com/fapi/beehive/public/v1/common/order/list-detail?leaderMark=iHPrkzK2zSwirdW3XpjOsg%3D%3D"
    //"https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=iHPrkzK2zSwirdW3XpjOsg%3D%3D"
  );
  const response: any = await rs.json();
  // console.log(response);
  const curPosition = response.result.data;
  const isSameTrade = (a: ApiObject, b: ApiObject) =>
    a.symbol === b.symbol &&
    a.entryPrice === b.entryPrice &&
    a.sizeX === b.sizeX &&
    a.side === b.side &&
    a.leverageE2 === b.leverageE2;
  // a.symbol == b.symbol && parseInt(a.entryPrice) == parseInt(b.entryPrice) &&
  // parseInt(a.sizeX) == parseInt(b.sizeX) && a.side == b.side &&
  // parseInt(a.leverageE2) == parseInt(b.leverageE2);
  const getUniqueTrades = (left: ApiObject[], right: ApiObject[], compareFunction: (a: ApiObject, b: ApiObject) => boolean): ApiObject[] =>
    left.filter(
      (leftValue) =>
        !right.some((rightValue) => compareFunction(leftValue, rightValue))
    );
  if (data.prePosition !== undefined) {
    const closeList: ApiObject[] = getUniqueTrades(data.prePosition, curPosition, isSameTrade);
    const openList: ApiObject[] = getUniqueTrades(curPosition, data.prePosition, isSameTrade);
    if (closeList.length > 0) {
      const updatedCloseList: ApiObject[] = await Promise.all(await updateList('sell', closeList));
      data.close.push(...updatedCloseList);
      convertAndSendBot('close', updatedCloseList);
    }
    if (openList.length > 0) {
      const updatedOpenList: ApiObject[] = await Promise.all(await updateList('buy', openList));
      // console.log(updatedBuyList);
      data.open.push(...updatedOpenList);
      convertAndSendBot('open', updatedOpenList)
    }
    data.symbols = closeList.map((c) => c.symbol);
  }

  data.prePosition = curPosition;
  data.prePosition.forEach((c) => {
    const originalDate = new Date(parseInt(c.createdAtE3));
    c.createDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
  });
}

export async function main() {
  try {
    if (data.botEnabled) {
      await getOrderList();
    }
    await new Promise((r) => setTimeout(r, INTERVAL));
    await main();
  } catch (err) {
    console.log(err);
    await new Promise((r) => setTimeout(r, INTERVAL));
    await main();
  }
}

function formatDateString(dateTime: Date) {
  const date = dateTime.getDate();
  const month = dateTime.getMonth() + 1;
  const year = dateTime.getFullYear();
  const hours = dateTime.getHours();
  const minutes = dateTime.getMinutes();
  return `${date}/${month}/${year} ${hours}:${minutes}`
}


function convertAndSendBot(action: string, data: ApiObject[]) {
  for (const item of data) {
    let dataString = '';
    let icon = '';
    if (item.side === 'Buy') {
      icon = 'bull';
    } else {
      icon = 'bear';
    }
    dataString = "Action: " + action + "\nSymbol: " + item.symbol + "\nEntry: " + item.entryPrice + "\nSide: " + item.side + "\nLeverage: " + item.leverageE2 + "\nMarkPrice: " + item.markPrice;
    // if (item.symbol === 'SOLUSDT') {
    // console.log(dataString);
    sendChatToBot(icon, dataString);
    // }   
    // break;
  }
}