import {
    UnifiedMarginClient,
    RestClientV5
} from 'bybit-api';
import { BatchOrders, Leverage, Order } from './interface';
import { restClient } from './main';


export function getAccountByBit(client: UnifiedMarginClient) {
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

export async function getMarkPrice(client: UnifiedMarginClient, symbol: string | undefined): Promise<string> {
    try {
        const res = await client.getPrivate('/v5/market/tickers?category=inverse&symbol=' + symbol)
            .then(res => { return res.result.list[0].markPrice });
        return res;
    }
    catch {
        return "error"
    }
}

export async function getWalletBalance(client: UnifiedMarginClient) {
    const res = client.getPrivate('/unified/v3/private/account/wallet/balance')
        .then(res => { return res });
    return res
}

export async function getMyPositions(client: UnifiedMarginClient) {
    // const res = await client.getPositions({ category: 'linear' })
    const res = await client.getPrivate('/unified/v3/private/position/list', { category: 'linear' })
        .then(res => {
            // console.log(res.result.list);
            return res
        });
    return res;
}

export async function createBatchOrders(client: UnifiedMarginClient, batchOrders: BatchOrders) {
    try {
        const result = await client.postPrivate('/unified/v3/private/order/create-batch', batchOrders)
            .then(res => { return res });
        // const result = await client.postPrivate('/unified/v3/private/order/create', newOrder);
        return result;
    } catch (error) {
        console.error(error);
    }
}

export async function createOrder(client: UnifiedMarginClient, order: Order) {
    try {
        const result = await client.postPrivate('/unified/v3/private/order/create', order)
            .then(res => { return res });
        // const result = await client.postPrivate('/unified/v3/private/order/create', newOrder);
        return result;
    } catch (error) {
        console.error(error);
    }
}

export async function setLeverage(client: UnifiedMarginClient, leverage: Leverage) {
    try {
        const result = await client.postPrivate('unified/v3/private/position/set-leverage', leverage)
            .then(res => { return res });
        return result;
    } catch (error) {
        console.error(`Lever ${error}`);
    }
}

export async function getExchangeInfo(client: UnifiedMarginClient) {
    try {
        const res = await client.getPrivate('/v5/market/instruments-info?category=linear')
            .then(res => { return res.result.list });
        return res;
    }
    catch (error) {
        return `exchange ${error}`
    }
}

export async function getClosedPNL(symbol?: string, limit?: number) {
    try {
        const time = new Date().getTime() - 2592117632;
        const res = await restClient.getClosedPnL({ category: "linear", symbol: symbol, limit: limit, startTime: time })
            .then(res => { return res.result.list });
        return res;
    }
    catch (error) {
        return `getClosePnL ${error}`
    }
}
