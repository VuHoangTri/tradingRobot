export let prePosition = [];
export const sell = [];
export const buy = [];
export let botEnabled = true;
export let symbols = [];
import { fetch } from "node-fetch";

export async function GetPosition() {
  const rs = await fetch(
    "https://api2.bybit.com/fapi/beehive/public/v1/common/order/list-detail?leaderMark=iHPrkzK2zSwirdW3XpjOsg%3D%3D"
  );
  const response = rs.json();
  const curPosition = response.result.data;
  const isSameSymbol = (a, b) =>
    a.symbol == b.symbol && a.entryPrice == b.entryPrice;
  const onlyInLeft = (left, right, compareFunction) =>
    left.filter(
      (leftValue) =>
        !right.some((rightValue) => compareFunction(leftValue, rightValue))
    );
  const sellList = onlyInLeft(prePosition, curPosition, isSameSymbol);
  const buyList = onlyInLeft(curPosition, prePosition, isSameSymbol);
  sellList.forEach((c) => {
    c.sellDate = new Date();
  });
  symbols = sellList.map((c) => c.symbol);
  sell.push(...sellList);
  buy.push(...buyList);
  prePosition = curPosition.forEach((c) => {
    c.createDate = new Date(c.createdAtE3);
  });
}

export async function main() {
  try {
    if (botEnabled) {
      await GetPosition();
    }
    await new Promise((r) => setTimeout(r, INTERVAL));
    await main();
  } catch (err) {
    console.log(err);
  }
}
