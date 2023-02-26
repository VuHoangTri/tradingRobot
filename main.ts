import fetch from "node-fetch";
import { getMarkPrice } from './bybit';
import _ from 'lodash';
export interface ApiObject {
  symbol: string;
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
  sell: ApiObject[];
  buy: ApiObject[];
  botEnabled: boolean;
  symbols: any[];
  prePosition: ApiObject[]
}
export const data: data = {
  sell: [],
  buy: [],
  botEnabled: true,
  symbols: [],
  prePosition: []
}
import { INTERVAL } from "./constant"

export async function GetPosition() {
  const rs = await fetch(
    "https://api2.bybit.com/fapi/beehive/public/v1/common/order/list-detail?leaderMark=iHPrkzK2zSwirdW3XpjOsg%3D%3D"
    //"https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=iHPrkzK2zSwirdW3XpjOsg%3D%3D"
  );
  const response: any = await rs.json();
  // console.log(response);
  const curPosition = response.result.data;
  const isSameSymbol = (a, b) =>
    a.symbol == b.symbol && parseInt(a.entryPrice) == parseInt(b.entryPrice) &&
    parseInt(a.sizeX) == parseInt(b.sizeX) && a.side == b.side &&
    parseInt(a.leverageE2) == parseInt(b.leverageE2);
  const onlyInLeft = (left, right, compareFunction) =>
    left.filter(
      (leftValue) =>
        !right.some((rightValue) => compareFunction(leftValue, rightValue))
    );
  if (data.prePosition !== undefined) {
    const sellList: ApiObject[] = onlyInLeft(data.prePosition, curPosition, isSameSymbol);
    const buyList: ApiObject[] = onlyInLeft(curPosition, data.prePosition, isSameSymbol);
    if (sellList.length > 0) {
      sellList.forEach(async (c) => {
        const originalDate = new Date();
        const markPrice = await getMarkPrice(c.symbol);
        console.log(markPrice, c.symbol);
        c.sellDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
        // c.markPrice = markPrice;
      });
      convertAndSendBot(sellList);
    }
    if (buyList.length > 0) {
      buyList.forEach(async (c) => {
        const originalDate = new Date();
        const markPrice = await getMarkPrice(c.symbol);
        c.buyDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
        c.markPrice = markPrice;
        console.log(c.markPrice, c.symbol);
      });
      convertAndSendBot(buyList)
    }
    data.symbols = sellList.map((c) => c.symbol);
    data.sell.push(...sellList);
    data.buy.push(...buyList);
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
      await GetPosition();
    }
    await new Promise((r) => setTimeout(r, INTERVAL));
    await main();
  } catch (err) {
    console.log(err);
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

async function sendChatToBot(text: string) {
  const urlBot = 'https://hooks.slack.com/services/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';
  const body = {
    "type": "modal",
    "title": {
      "type": "plain_text",
      "text": "My App",
      "emoji": true
    },
    "blocks": [
      {
        "type": "context",
        "elements": [
          {
            "type": "image",
            "image_url": "https://pbs.twimg.com/profile_images/625633822235693056/lNGUneLX_400x400.jpg",
            "alt_text": "cute cat"
          },
          {
            "type": "mrkdwn",
            "text": text
          }
        ]
      }
    ]
  };
  await fetch(urlBot,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
}

function convertAndSendBot(data: ApiObject[]) {
  for (const item of data) {
    let dataString = '';
    // dataString = `Symbol:   ${item.symbol}
    // Entry: ${item.entryPrice}
    // Side: ${item.side}
    // Leverage: ${item.leverageE2}`
    dataString = "Symbol:   " + item.symbol + "\nEntry: :" + item.entryPrice + "\nSide: " + item.side + "\nLeverage: " + item.leverageE2 + "\nMarkPrice: " + item.markPrice;
    // dataString = JSON.stringify(dataString).split('"').join("");
    console.log(dataString);
    sendChatToBot(dataString);
    break;
  }

}