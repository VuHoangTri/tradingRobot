import { RequestInit } from "node-fetch";
import { createBatchOrders, createOrder, getMarkPrice, getMyPositions, setLeverage } from "./bybit";
import { BINANCEURL, LEVERAGEBYBIT, SIZEBYBIT, binanceTrader, exchangeInfo, gain, wagonTrader } from "./constant";
import { ApiObject, BatchOrders, Leverage, Order, Position } from "./interface";
import { data, firstGet, } from "./main";
import { sendChatToBot } from "./slack";
import _ from 'lodash';
import { UnifiedMarginClient } from "bybit-api";
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
    // console.log(binanceCopyPos.length + count)
    for (let i = length; i < binanceCopyPos.length + length; i++) {
        const list = binanceCopyPos[i - length];
        const response: any = await list.json();
        if (response.success === true && response.code === "000000") {
            const data = await convertBinanceFormat(i, response.data.otherPositionRetList);
            curPosition.push(data);
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
    } catch (err) {
        console.log(err);
        return null
    }
}

export async function adjustLeverage(client: UnifiedMarginClient, positions: Position[]) {
    try {
        let count = 0;
        for await (const pos of positions) {
            const lever = (Number(pos.leverage) / LEVERAGEBYBIT).toString();
            const leverage: Leverage = {
                category: 'linear',
                symbol: pos.symbol,
                sellLeverage: lever,
                buyLeverage: lever
            };
            await setLeverage(client, leverage);
            if (count === 3) {
                await new Promise((r) => setTimeout(r, 2000));
                count = 0;
                // console.log(87, "relax");
            } else {
                count++;
            }
        }
    } catch (err) {
        console.log(err);
    }
}

export async function openBatchOrders(clientNumber: number, client: UnifiedMarginClient,
    batchOrders: BatchOrders) {
    try {
        if (batchOrders.request.length > 0) {
            for (let i = 0; i < batchOrders.request.length; i += 9) {
                const chunkBatchOrders: BatchOrders = _.cloneDeep(batchOrders);
                chunkBatchOrders.request = chunkBatchOrders.request.slice(i, i + 9);
                const resCreate = await createBatchOrders(client, chunkBatchOrders);
                // console.log(140, batchOrders.request, resCreate.result.list);
                for (let i = 0; i < resCreate.result.list.length; i++) {
                    if (resCreate.retCode === 0 && resCreate.result.list[i].orderId !== '') {
                        const order = batchOrders.request[i];
                        // convertAndSendBot(order.side, order, clientNumber)
                    }
                }
            }
        }
    } catch (err) {
        console.log(err);
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
        // const isBatch = true;
        // console.log(166, curPos, data.prePosition[clientNumber]);
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
        const openPosFine = _.cloneDeep(openPos.filter(c => exchangeInfo.some(x => c.symbol === x.symbol)) || []);
        // console.log(183, openPos, openPosFine);
        if (openPosFine.length > 0) {
            console.log('Open Position', openPosFine, data.prePosition[clientNumber], clientNumber);
            await adjustLeverage(client, openPosFine);
            const batchOpenPos: BatchOrders = { category: "linear", request: [] };
            for await (const pos of openPosFine) {
                const filter = exchangeInfo.find(exch => exch.symbol === pos.symbol).lotSizeFilter;
                pos.size = roundQuantity(pos.size, filter.minOrderQty, filter.qtyStep);
                const order = await convertToOrder(client, pos, true);
                if (order !== null) {
                    order.leverage = pos.leverage;
                    batchOpenPos.request.push(order);
                }
            }
            await openBatchOrders(clientNumber, client, batchOpenPos)
        }
        if (adjustPos.length > 0 || closePos.length > 0) {
            const myPos = await getMyPositions(client);
            if (closePos.length > 0) {
                console.log('Close Position', closePos, data.prePosition[clientNumber], clientNumber);
                const batchClosePos: BatchOrders = { category: "linear", request: [] };
                for (const pos of closePos) {
                    const order = await adjustVol(client, pos.symbol, '0', myPos);
                    if (order !== null)
                        batchClosePos.request.push(order);
                }
                await openBatchOrders(clientNumber, client, batchClosePos);
            }
            if (adjustPos.length > 0) {
                console.log('Adjust Position', adjustPos, data.prePosition[clientNumber], clientNumber);
                const batchAdjustPos: BatchOrders = { category: "linear", request: [] };
                for (const pos of adjustPos) {
                    const filter = exchangeInfo.find(exch => exch.symbol === pos.symbol).lotSizeFilter;
                    const order = await adjustVol(client, pos.symbol, pos.size, myPos, filter);
                    if (order !== null)
                        batchAdjustPos.request.push(order);
                }
                await openBatchOrders(clientNumber, client, batchAdjustPos);
                // console.log(165, batchAdjustPos.length);
            }
        }
        data.prePosition[clientNumber] = _.cloneDeep(curPos);
        // console.log(216, openPos, closePos, adjustPos, data.prePosition[clientNumber], curPos, clientNumber);
    } catch (err) {
        console.log(err);
    }
}

async function adjustVol(client: UnifiedMarginClient, symbol: string, size: string, myPos: any, filter?: any) {
    try {
        const newPos = myPos.result.list.filter(c => c.symbol === symbol)[0];
        const percent = Number(size) / Number(newPos.size);
        newPos.size = Number(newPos.size) * percent - Number(newPos.size);
        if (Number(size) !== 0) {
            newPos.size = roundQuantity(newPos.size, filter.minOrderQty, filter.qtyStep);
        }
        // console.log(228, newPos);
        const order = await convertToOrder(client, newPos, true);
        if (order !== null)
            order.leverage = newPos.leverage;
        return order;
    } catch (err) {
        console.log(err);
        return null;
    }
}

function convertAndSendBot(action: string | undefined, order, clientNumber: number) {
    // for (const item of data) {
    let dataString = '';
    let icon = '';
    if (order.side === 'Buy') {
        icon = 'bull';
    } else {
        icon = 'bear';
    }
    dataString = "Action: " + action + "\nSymbol: " + order.symbol
        + "\nEntry: " + order.price + "\nSide: " + order.side + "\nLeverage: "
        + order.leverage + "\nSize: " + order.qty;
    //(parseInt(order.size) / SIZEBYBIT).toString();
    sendChatToBot(icon, dataString, clientNumber);
    // }   
    // break;
    // }
}
