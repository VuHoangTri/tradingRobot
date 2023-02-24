import fetch from "node-fetch";
import fs from "fs";

interface data {
  sell: any[];
  buy: any[];
  botEnabled: boolean;
  symbols: any[];
  prePosition: any[]
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
  );
  const response: any = await rs.json();
  // console.log(response);
  const curPosition = response.result.data;
  const isSameSymbol = (a, b) =>
    a.symbol == b.symbol && a.entryPrice == b.entryPrice;
  const onlyInLeft = (left, right, compareFunction) =>
    left.filter(
      (leftValue) =>
        !right.some((rightValue) => compareFunction(leftValue, rightValue))
    );
  if (data.prePosition !== undefined) {
    const sellList: any[] = onlyInLeft(data.prePosition, curPosition, isSameSymbol);
    const buyList: any[] = onlyInLeft(curPosition, data.prePosition, isSameSymbol);
    if (sellList.length > 0)
      sellList.forEach((c) => {
        const originalDate = new Date();
        c.sellDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
      });
    if (buyList.length > 0)
      buyList.forEach((c) => {
        const originalDate = new Date();
        c.buyDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
      });
    data.symbols = sellList.map((c) => c.symbol);
    data.sell.push(...sellList);
    data.buy.push(...buyList);
  }

  data.prePosition = curPosition;
  data.prePosition.forEach((c) => {
    const originalDate = new Date(parseInt(c.createdAtE3));
    c.createDate = formatDateString(new Date(originalDate.getTime() + (7 * 3600 * 1000)));
  });
  // Check if the directory exists
  // if (!fs.existsSync('newfile.txt')) {

  //   // synchronously create a directory
  //   fs.mkdirSync('newfile.txt');

  // }
  // else {
  //   console.log('Đã có');
  // }
  // fs.writeFile('./logs/newfile.txt', 'New text file content line!', function (err) {

  //   console.log('A new text file was created successfully.');

  // });
  // fs.writeFile('./data.txt',
  //   `Name: ${name}\nOtherData: ${otherData}`
  //   , () => {
  //     console.log('Successfully saved');
  //   })
  // // console.log(data.prePosition);
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