import {
    UnifiedMarginClient,
} from 'bybit-api';
import { BatchOrders, Leverage, Order } from './interface';
import { restClient } from './main';


export function getAccountByBit(client: UnifiedMarginClient) {
    const info = client.getPrivate('/unified/v3/private/account/info')
        .then(result => {
            // console.log("getAccountInfo result: ", result);
            return result;
        })
        .catch(err => {
            console.error("getAccountInfo error: ", err);
        });
    return info;
}

export async function getMarkPrice(symbol: string): Promise<string> {
    try {
        const res = await restClient.getTickers({ category: "linear", symbol: symbol })
            .then(res => { return res.result.list[0] });
        const markPrice: any = res;
        return markPrice.markPrice;
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

export async function getClosedPNL(pnlParam: { symbol?: string, limit?: number, cursor?: string }) {
    try {
        const time = new Date().getTime() - 2592117632;
        const res = await restClient.getClosedPnL({
            category: "linear", symbol: pnlParam.symbol, limit: pnlParam.limit
            , startTime: time, cursor: pnlParam.cursor
        })
            .then(res => { return res.result });
        return res;
    }
    catch (error) {
        return `getClosePnL ${error}`
    }
}

export async function getTradeFee(pnlParam: { symbol?: string, limit?: number, cursor?: string }) {
    try {
        const time = new Date().getTime() - 2592117632;
        const res = await restClient.getTransactionLog({
            type: 'TRADE', currency: 'USDT', accountType: 'UNIFIED',
            category: "linear"
            , startTime: time, cursor: pnlParam.cursor
        })
            .then(res => { return res.result });
        return res;
    }
    catch (error) {
        return `getClosePnL ${error}`
    }
}
