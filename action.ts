import { createBatchOrders, createOrder, getMarkPrice, getMyPositions, setLeverage } from "./bybit";
import { LEVERAGEBYBIT, SIZEBYBIT, gain } from "./constant";
import { ApiObject, BatchOrders, Leverage, Order, Position } from "./interface";
import { firstGet, data, firstCompare, exchangeInfo } from "./main";
import { sendChatToBot } from "./slack";
import _ from 'lodash';
import { UnifiedMarginClient } from "bybit-api";

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

export async function convertToOrder(client: UnifiedMarginClient, pos: Position, isBatch: boolean) {
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
}

export async function adjustLeverage(client: UnifiedMarginClient, positions: Position[]) {
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
            await new Promise((r) => setTimeout(r, 1000));
            count = 0;
            // console.log(87, "relax");
        } else {
            count++;
        }

    }
}

export async function openBatchOrders(clientNumber: number, client: UnifiedMarginClient,
    batchOrders: BatchOrders, pos: Position[]) {
    if (batchOrders.request.length > 0) {
        // console.log(87, batchOrders.request);
        for (let i = 0; i < batchOrders.request.length; i += 9) {
            const chunkBatchOrders: BatchOrders = _.cloneDeep(batchOrders);
            chunkBatchOrders.request = chunkBatchOrders.request.slice(i, i + 9);
            // console.log(chunkBatchOrders.request.length);
            const resCreate = await createBatchOrders(client, chunkBatchOrders);
            // console.log(93, resCreate.result.list);
            for (let i = 0; i < resCreate.result.list.length; i++) {
                if (resCreate.retCode === 0 && resCreate.result.list[i].orderId !== '') {
                    const order = batchOrders.request[i];
                    order.leverage = pos[i].leverage;
                    convertAndSendBot(order.side, order, clientNumber)
                }
            }
        }
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

let compare = false;
export async function comparePosition(clientNumber: number, client: UnifiedMarginClient, curPos: Position[]): Promise<void> {
    const isBatch = true;
    if (firstGet[clientNumber]) {
        const myPos = await getMyPositions(client);
        if (myPos.retMsg !== 'Success') {
            data.botEnabled = false;
        }
        // console.log(114, myPos, clientNumber);
        data.prePosition[clientNumber] = myPos.result.list.map((c: Position) => {
            return {
                symbol: c.symbol,
                size: c.size,
                leverage: c.leverage
            }
        });
        firstGet[clientNumber] = false;
        // console.log(119, data.prePosition[clientNumber], clientNumber);
    }
    else {
        const openPos = _.differenceBy(curPos, data.prePosition[clientNumber], 'symbol');
        const closePos = _.differenceBy(data.prePosition[clientNumber], curPos, 'symbol');
        let adjustPos: any = [];
        if (compare === true) {
            adjustPos = curPos.filter(pP =>
                data.prePosition[clientNumber].some(cP =>
                    cP.symbol === pP.symbol && Number(cP.size) !== Number(pP.size)
                )
            ) || [];
        }
        else {
            compare = false;
        }
        const openPosFine = openPos.filter(c => exchangeInfo.some(x => c.symbol === x.symbol)) || [];
        // console.log(158, openPosFine, closePos, adjustPos, data.prePosition[clientNumber], clientNumber);
        if (openPosFine.length > 0) {
            await adjustLeverage(client, openPosFine);
            const batchOpenPos: BatchOrders = { category: "linear", request: [] };
            for await (const pos of openPosFine) {
                const filter = exchangeInfo.find(exch => exch.symbol === pos.symbol).lotSizeFilter;
                pos.size = roundQuantity(pos.size, filter.minOrderQty, filter.qtyStep);
                const order = await convertToOrder(client, pos, true);
                batchOpenPos.request.push(order);
            }
            await openBatchOrders(clientNumber, client, batchOpenPos, openPosFine)
            console.log(169, batchOpenPos.request.length, openPosFine.length, clientNumber);
        }
        if (adjustPos.length > 0 || closePos.length > 0) {
            const myPos = await getMyPositions(client);
            if (closePos.length > 0) {
                const batchClosePos: BatchOrders = { category: "linear", request: [] };
                for (const pos of closePos) {
                    const order = await adjustVol(client, pos.symbol, '0', myPos);
                    // console.log(172, order);
                }
                await openBatchOrders(clientNumber, client, batchClosePos, adjustPos)

            }
            if (adjustPos.length > 0) {
                const batchAdjustPos: BatchOrders = { category: "linear", request: [] };
                for (const pos of adjustPos) {
                    const filter = exchangeInfo.find(exch => exch.symbol === pos.symbol).lotSizeFilter;
                    const order = await adjustVol(client, pos.symbol, pos.size, myPos, filter);
                    batchAdjustPos.request.push(order);
                    // console.log(172, order);
                }
                await openBatchOrders(clientNumber, client, batchAdjustPos, adjustPos)

            }
        }
        data.prePosition[clientNumber] = curPos;
    }
}

async function adjustVol(client: UnifiedMarginClient, symbol: string, size: string, myPos: any, filter?: any) {
    const newPos = myPos.result.list.filter(c => c.symbol === symbol)
    const percent = Number(size) / Number(newPos.size);
    newPos.size = Number(newPos.size) * percent - Number(size);
    if (percent > 0) {
        newPos.size = roundQuantity(newPos.size, filter.minOrderQty, filter.qtyStep);
    } else {
        newPos.size = newPos.size * -1;
    }
    return convertToOrder(client, newPos, true);
}


async function compareSize(client: UnifiedMarginClient, clientNumber: number, adjustPos: Position[], curPos: Position[]) {
    const isBatch = true;
    const batchChangePos: BatchOrders = { category: "linear", request: [] };
    // console.log(188, adjustPos, curPos);
    for (const pos of adjustPos) {
        const matchingPos = curPos.filter((cPos) => pos.symbol === cPos.symbol)[0];
        const matchPosSize = Number(matchingPos.size);
        const posSize = Number(pos.size);
        const diffSize = Math.round((posSize - matchPosSize) * SIZEBYBIT) / SIZEBYBIT;
        // console.log(194, posSize, matchPosSize, diffSize);
        const newPos: Position = {
            symbol: pos.symbol,
            leverage: pos.leverage,
            size: Math.abs(diffSize).toString()
        }
        if (matchPosSize > posSize) {
            newPos.side = 'Buy';
        } else {
            newPos.side = 'Sell';
        }
        const order = await convertToOrder(client, newPos, isBatch);
        if (order !== undefined)
            batchChangePos.request.push(order);
    }
    firstCompare[clientNumber] = false;
    return batchChangePos;
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
