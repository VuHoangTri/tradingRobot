import {
    UnifiedMarginClient,
} from 'bybit-api';
import { BatchOrders, Leverage, Order } from './interface';


// const API_KEY = 'SOXLVHCJHFOTNOEUTJ';
const API_KEY = 'GJJ2ZtB6THPcj5a955'; // testnet 
// const API_SECRET = 'ECQKGOHRMDYBJSXCMUMXRZRUAIWCNFTIUYNZ';
const API_SECRET = 'gxxu2TViRHDqCnbyX85EpGxxBXEOms8nLZfY'; // testnet 
const useTestnet = true;

const client = new UnifiedMarginClient({
    key: API_KEY,
    secret: API_SECRET,
    testnet: useTestnet
},
    // requestLibraryOptions
);

export function getAccountByBit() {
    const info = client.getPrivate('/unified/v3/private/account/info')
        .then(result => {
            console.log("getAccountInfo result: ", result);
            return result.result;
        })
        .catch(err => {
            console.error("getAccountInfo error: ", err);
        });
    return info;
}

export async function getMarkPrice(symbol: string | undefined): Promise<string> {
    const res = await client.getPrivate('/v5/market/tickers?category=inverse&symbol=' + symbol)
        .then(res => { return res.result.list[0].markPrice });
    return res;
}

export async function getWalletBalance() {
    const res = client.getPrivate('/unified/v3/private/account/wallet/balance')
        .then(res => { return res });
    return res
}

export async function getMyPositions() {
    const res = await client.getPositions({ category: 'linear' })
        // const res = await client.getPrivate('/v2/private/position/list')
        .then(res => {
            // console.log(res.result.list);
            return res.result.list
        });
    return res;
}

export async function createBatchOrder(batchOrders: BatchOrders) {
    try {
        const result = await client.postPrivate('/unified/v3/private/order/create-batch', batchOrders)
            .then(res => { return res });
        // const result = await client.postPrivate('/unified/v3/private/order/create', newOrder);
        return result;
    } catch (error) {
        console.error(error);
    }
}

export async function createOrder(order: Order) {
    try {
        const result = await client.postPrivate('/unified/v3/private/order/create', order)
            .then(res => { return res });
        // const result = await client.postPrivate('/unified/v3/private/order/create', newOrder);
        return result;
    } catch (error) {
        console.error(error);
    }
}

export async function setLeverage(leverage: Leverage) {
    try {
        const result = await client.postPrivate('unified/v3/private/position/set-leverage', leverage)
            .then(res => { return res });
        return result;
    } catch (error) {
        console.error(`Lever ${error}`);
    }
}
