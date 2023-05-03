import { RequestInit } from "node-fetch";
import { createBatchOrders, createOrder, getClosedPNL, getMarkPrice, getMyPositions, setLeverage } from "./bybit";
import { BINANCEURL, LEVERAGEBYBIT, SIZEBYBIT, binanceTrader, exchangeInfo, gain, hotcoinTrader, wagonTrader } from "./constant";
import { ApiObject, BatchOrders, Leverage, Order, Position } from "./interface";
import { data, firstGet, } from "./main";
import { sendChatToBot, sendError } from "./slack";
import _ from 'lodash';
import { ClosedPnLV5, UnifiedMarginClient } from "bybit-api";
import fetch from "node-fetch";

export function convertByBitFormat(position: ApiObject[]) {
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol,
            side: pos.side,
            size: pos.sizeX,
            leverage: pos.leverageE2
        }
    });
    return res;
}

export function convertWagonFormat(clientNumber, position: any[]) {
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol,
            size: (Number(pos.positionAmount) / gain[clientNumber]).toFixed(3).toString(),
            leverage: (pos.leverage * LEVERAGEBYBIT).toString()
        }
    });
    return res;
}

export function convertBinanceFormat(clientNumber: number, position: any[]) {
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol,
            size: (Number(pos.amount) / gain[clientNumber]).toFixed(3).toString(),
            leverage: (pos.leverage * LEVERAGEBYBIT).toString()
        }
    });
    return res;
}

export function convertHotCoinFormat(clientNumber: number, position: any[]) {
    const res: Position[] = position.map(pos => {
        let sideConverter = 1;
        if (pos.side === "short") sideConverter = -1;
        return {
            symbol: pos.contractCodeDisplayName,
            size: (((Number(pos.openMargin) * pos.lever / Number(pos.price)) / gain[clientNumber]) * sideConverter).toFixed(3).toString(),
            leverage: (pos.lever * LEVERAGEBYBIT).toString()
        }
    });
    return res;
}

export async function getCopyList() {
    const curPosition: Position[][] = [];

    const wagonCopyPos: any = [];
    for (const trader of wagonTrader) {
        wagonCopyPos.push(await fetch(trader));
    }
    for (let i = 0; i < wagonCopyPos.length; i++) {
        const list = wagonCopyPos[i];
        const response: any = await list.json();
        if (response.success === true && response.code === "000000") {
            curPosition.push(await convertWagonFormat(i, response.data));
        }
    }
    const binanceCopyPos: any = [];
    for (const trader of binanceTrader) {
        const requestOptions: RequestInit = {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            redirect: "follow",
            body: JSON.stringify(trader),
        };
        binanceCopyPos.push(await fetch(BINANCEURL, requestOptions));
    }
    const length = curPosition.length;
    for (let i = length; i < binanceCopyPos.length + length; i++) {
        const list = binanceCopyPos[i - length];
        const response: any = await list.json();
        if (response.success === true && response.code === "000000") {
            const data = await convertBinanceFormat(i, response.data.otherPositionRetList);
            curPosition.push(data);
        }
    }
    const hotcoinCopyPos: any = [];
    for (const trader of hotcoinTrader) {
        hotcoinCopyPos.push(await fetch(trader));
    }
    for (let i = 0; i < hotcoinCopyPos.length; i++) {
        const list = hotcoinCopyPos[i];
        const response: any = await list.json();
        if (response.msg === "success" && response.code === 200) {
            curPosition.push(await convertHotCoinFormat(i, response.data));
        }
    }
    return curPosition;
}

export async function convertToOrder(client: UnifiedMarginClient, pos: Position, isBatch: boolean) {
    try {
        const price = await getMarkPrice(client, pos.symbol);
        const newSide = Number(pos.size) < 0 ? 'Sell' : 'Buy';
        let newPrice = '';
        if (newSide === 'Buy') {
            newPrice = ((Number(price) * 1.1)).toFixed(3).toString()
        } else {
            newPrice = (Number(price) * 0.9).toFixed(3).toString()
        }
        const res: Order = {
            symbol: pos.symbol,
            orderType: 'Limit',
            qty: Math.abs(Number(pos.size)).toString(),
            side: newSide,
            price: newPrice,
            timeInForce: 'GoodTillCancel',
        };
        if (!isBatch) {
            res.category = 'linear';
        }
        return res;
    } catch (err: any) {
        sendError(err);
        return null;
    }
}

export async function adjustLeverage(client: UnifiedMarginClient, positions: Position[], filter: any) {
    try {
        let count = 0;
        for await (const pos of positions) {
            const leverageFilter = exchangeInfo.find(c => c.symbol === pos.symbol).leverageFilter;
            const lever = (Number(pos.leverage) / LEVERAGEBYBIT).toString();
            const selectedLever = (lever >= leverageFilter.maxLeverage)
                ? leverageFilter.maxLeverage
                : lever;
            const leverage: Leverage = {
                category: 'linear',
                symbol: pos.symbol,
                sellLeverage: selectedLever,
                buyLeverage: selectedLever
            };
            const res = await setLeverage(client, leverage);
            // console.log(res);
            if (count === 3) {
                await new Promise((r) => setTimeout(r, 2000));
                count = 0;
            } else {
                count++;
            }
        }
    } catch (err: any) {
        sendError(err);
    }
}

export async function openBatchOrders(clientNumber: number, client: UnifiedMarginClient,
    batchOrders: BatchOrders, pnl: boolean) {
    try {
        if (batchOrders.request.length > 0) {
            for (let i = 0; i < batchOrders.request.length; i += 9) {
                const chunkBatchOrders: BatchOrders = _.cloneDeep(batchOrders);
                chunkBatchOrders.request = chunkBatchOrders.request.slice(i, i + 9);
                const resCreate = await createBatchOrders(client, chunkBatchOrders);
                for (let i = 0; i < resCreate.result.list.length; i++) {
                    if (resCreate.retCode === 0 && resCreate.result.list[i].orderId !== '') {
                        console.log("Batch Order", resCreate.result.list[i].orderId);
                        const order = batchOrders.request[i];
                        let actualPNL = "";
                        if (pnl === true) {
                            const res = await getClosedPNL({ symbol: order.symbol, limit: 1 });
                            if (typeof res !== 'string')
                                actualPNL = res.list[0].closedPnl;
                        }
                        convertAndSendBot(order.side, order, clientNumber, actualPNL);
                    }
                }
            }
        }
    } catch (err: any) {
        sendError(err);
    }
}

function roundQuantity(size, minOrderQty, qtyStep) {
    const decimalLen = minOrderQty.toString().split('.')[1]?.length ?? 0;
    const s = Math.abs(Number(size));
    const mOQ = Number(minOrderQty);
    const qS = Number(qtyStep);
    const nearestMultiple = Math.max(mOQ, Math.round(s / qS) * qS);
    return (size < 0 ? -nearestMultiple : nearestMultiple).toFixed(decimalLen);
}

export async function comparePosition(clientNumber: number, client: UnifiedMarginClient, curPos: Position[]): Promise<void> {
    try {
        const openPos = _.differenceBy(curPos, data.prePosition[clientNumber], 'symbol');
        const closePos = _.differenceBy(data.prePosition[clientNumber], curPos, 'symbol');
        let adjustPos: any = [];
        if (firstGet !== true) {
            adjustPos = curPos.filter(pP =>
                data.prePosition[clientNumber].some(cP =>
                    cP.symbol === pP.symbol && Number(cP.size) !== Number(pP.size)
                )
            ) || [];
        }
        // console.log("Difference", openPos, closePos, adjustPos, data.prePosition[clientNumber], curPos, clientNumber, new Date());
        if (openPos.length > 0) {
            const openPosFine = _.cloneDeep(openPos.filter(c => exchangeInfo.some(x => c.symbol === x.symbol)) || []);
            // console.log('Open Position', openPosFine, data.prePosition[clientNumber], clientNumber, new Date());
            await adjustLeverage(client, openPosFine, exchangeInfo);
            const batchOpenPos: BatchOrders = { category: "linear", request: [] };
            for await (const pos of openPosFine) {
                const filter = exchangeInfo.find(exch => exch.symbol === pos.symbol);
                const lotSizeFilter = filter.lotSizeFilter;
                pos.size = pos.leverage > filter.leverageFilter.maxLeverage
                    ? (Number(pos.size) * (Number(pos.leverage) / LEVERAGEBYBIT / Number(filter.leverageFilter.maxLeverage))).toString()
                    : pos.size
                pos.size = roundQuantity(pos.size, lotSizeFilter.minOrderQty, lotSizeFilter.qtyStep);
                const order = await convertToOrder(client, pos, true);
                console.log("Open", order, data.prePosition[clientNumber], curPos, new Date());
                if (order !== null) {
                    order.leverage = pos.leverage;
                    batchOpenPos.request.push(order);
                }
            }
            await openBatchOrders(clientNumber, client, batchOpenPos, false)
        }

        if (adjustPos.length > 0 || closePos.length > 0) {
            const myPos = await getMyPositions(client);
            if (closePos.length > 0) {
                const batchClosePos: BatchOrders = { category: "linear", request: [] };
                for (const pos of closePos) {
                    const filter = exchangeInfo.find(exch => exch.symbol === pos.symbol);
                    if (filter !== undefined) {
                        const order = await adjustVol(client, pos.symbol, '0', myPos);
                        console.log("Close", order, data.prePosition[clientNumber], curPos, new Date());
                        if (order !== null)
                            batchClosePos.request.push(order);
                    }
                }
                await openBatchOrders(clientNumber, client, batchClosePos, true);
            }
            if (adjustPos.length > 0) {
                const batchAdjustPos: BatchOrders = { category: "linear", request: [] };
                for (const pos of adjustPos) {
                    const filter = exchangeInfo.find(exch => exch.symbol === pos.symbol);
                    if (filter !== undefined) {
                        const filterSize = filter.lotSizeFilter;
                        const order = await adjustVol(client, pos.symbol, pos.size, myPos, filterSize);
                        console.log("Adjust", order, data.prePosition[clientNumber], curPos, new Date())
                        if (order !== null)
                            batchAdjustPos.request.push(order);
                    }
                }
                if (batchAdjustPos.request.length > 0)
                    await openBatchOrders(clientNumber, client, batchAdjustPos, true);
            }
        }
        data.prePosition[clientNumber] = _.cloneDeep(curPos);
    } catch (err: any) {
        sendError(err);
    }
}

async function adjustVol(client: UnifiedMarginClient, symbol: string, size: string, myPos: any, filter?: any) {
    try {
        const diffPos = _.cloneDeep(myPos.result.list.filter(c => c.symbol === symbol));
        // console.log(diffPos);
        if (diffPos.length === 1) {
            const newPos = diffPos[0];
            const percent = Number(size) / Number(newPos.size);
            newPos.size = Number(newPos.size) * percent - Number(newPos.size);
            if (Number(size) !== 0) {
                newPos.size = roundQuantity(newPos.size, filter.minOrderQty, filter.qtyStep);
            }
            const order = await convertToOrder(client, newPos, true);
            if (order !== null)
                order.leverage = newPos.leverage;
            return order;
        }
        return null;
    } catch (err: any) {
        sendError(err);
        return null;
    }
}

function convertAndSendBot(action: string | undefined, order, clientNumber: number, pnl: string) {
    try {
        let dataString = '';
        let icon = '';
        if (order.side === 'Buy') {
            icon = 'bull';
        } else {
            icon = 'bear';
        }
        dataString = "Action: " + action + "\nSymbol: " + order.symbol
            + "\nEntry: " + order.price + "\nSide: " + order.side + "\nLeverage: "
            + order.leverage + "\nSize: " + order.qty + "\nPnL: " + pnl;
        //(parseInt(order.size) / SIZEBYBIT).toString();
        sendChatToBot(icon, dataString, clientNumber);
    } catch (err: any) {
        sendError(err)
    }
}

export async function getTotalPnL(nextPageCursor?: string) {
    let res = await getClosedPNL({ cursor: nextPageCursor });
    let sum;
    // let count = 1;
    while (typeof res !== 'string' && res.nextPageCursor !== '') {
        sum = res.list.reduce((acc, cur) => acc + Number(cur.closedPnl), 0);
        // console.log('317', res.list[0].closedPnl, res.list[1].closedPnl, Number(res.list[0].closedPnl) + Number(res.list[1].closedPnl));
        res = await getClosedPNL({ cursor: res.nextPageCursor })
    }
    // console.log(count);
    return sum;
}