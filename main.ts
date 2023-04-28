import { Position, Data, Account } from "./interface";
import _ from 'lodash';
import { INTERVAL, BINANCEURL, wagonTrader, binanceTrader, exchangeInfo } from "./constant"
import { RestClientV5, UnifiedMarginClient } from "bybit-api";
import { comparePosition, getCopyList } from "./action";
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


export async function main() {
  try {
    const copyLength = wagonTrader.length + binanceTrader.length;
    // for (let i = 0; i < copyLength; i++) {
    //   data.prePosition.push([])
    // }
    const result = await getExchangeInfo(client[0]);
    exchangeInfo.push(...result);
    for (let i = 0; i < client.length; i++) {
      if (firstGet) {
        const myPos = await getMyPositions(client[i]);
        if (myPos.retMsg !== 'Success') {
          data.botEnabled = false;
        }
        data.prePosition.push(myPos.result.list.map((c: Position) => {
          return {
            symbol: c.symbol,
            size: c.size,
            leverage: c.leverage
          }
        }));
      }
      // console.log(data.prePosition);
      const curPosition = await getCopyList();
      // console.log(73, curPosition);
      await comparePosition(i, client[i], curPosition[i]);
    }
    firstGet = false;
    await new Promise((r) => setTimeout(r, 5000));
    await mainExecution();
    // await main();

  } catch (err) {
    console.log(err);
    await new Promise((r) => setTimeout(r, INTERVAL));
    // await main();
  }
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