import { createBatchOrders, createOrder, getMarkPrice, getMyPositions, setLeverage } from "./bybit";
import { LEVERAGEBYBIT, SIZEBYBIT, gain } from "./constant";
import { ApiObject, BatchOrders, Leverage, Order, Position } from "./interface";
import { firstGet, data, firstCompare } from "./main";
import { sendChatToBot } from "./slack";
import _ from 'lodash';
import { UnifiedMarginClient } from "bybit-api";

export async function convertByBitFormat(position: ApiObject[]) {
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol,
            side: pos.side,
            size: pos.sizeX,
            leverage: pos.leverageE2
        }
    });
    await Promise.resolve();
    return res;
}

export async function convertWagonFormat(clientNumber, position: any[]) {
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol,
            side: parseFloat(pos.positionAmount) > 0 ? "Buy" : "Sell",
            size: Math.abs(parseFloat(pos.positionAmount) / gain[clientNumber] * SIZEBYBIT).toFixed(0).toString(),
            leverage: (pos.leverage * LEVERAGEBYBIT).toString()
        }
    });
    await Promise.resolve();
    return res;
}

export async function convertBinanceFormat(clientNumber: number, position: any[]) {
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol,
            side: parseFloat(pos.amount) > 0 ? "Buy" : "Sell",
            size: Math.abs(parseFloat(pos.amount) / gain[clientNumber] * SIZEBYBIT).toFixed(0).toString(),
            leverage: (pos.leverage * LEVERAGEBYBIT).toString()
        }
    });
    await Promise.resolve();
    return res;
}

export async function convertToOrder(client: UnifiedMarginClient, pos: Position, isBatch: boolean) {
    const price = await getMarkPrice(client, pos.symbol);
    // console.log(price);
    if (price === 'error') return undefined;
    let newPrice = '';
    if (pos.side === 'Buy') {
        newPrice = ((parseFloat(price) * 1.01)).toFixed(3).toString()
    } else {
        newPrice = (parseFloat(price) * 0.99).toFixed(3).toString()
    }
    const res: Order = {
        symbol: pos.symbol,
        orderType: 'Limit',
        qty: (parseInt(pos.size) / SIZEBYBIT).toString(),
        side: pos.side,
        price: newPrice,
        timeInForce: 'GoodTillCancel',
    };
    if (!isBatch) {
        res.category = 'linear';
    }

    return res;
}
export async function adjustLeverage(client: UnifiedMarginClient, positions: Position[]) {
    for (const pos of positions) {
        const lever = (parseInt(pos.leverage) / LEVERAGEBYBIT).toString();
        const leverage: Leverage = {
            category: 'linear',
            symbol: pos.symbol,
            sellLeverage: lever,
            buyLeverage: lever
        };
        await setLeverage(client, leverage);
    }
}
export async function openBatchOrders(clientNumber: number, client: UnifiedMarginClient,
    batchOrders: BatchOrders, pos: Position[]) {
    // console.log(batchOrders);
    if (batchOrders.request.length !== 0) {
        // console.log(batchOrders.request.length);
        for (let i = 0; i < batchOrders.request.length; i += 9) {
            const chunkBatchOrders: BatchOrders = _.cloneDeep(batchOrders);
            chunkBatchOrders.request = chunkBatchOrders.request.slice(i, i + 9);
            // console.log(chunkBatchOrders.request.length);
            const resCreate = await createBatchOrders(client, chunkBatchOrders);
            // console.log(resCreate);
            if (resCreate.retCode === 0 && resCreate.result.list[0].orderId !== '') {
                for (let i = 0; i < batchOrders.request.length; i++) {
                    const order = batchOrders.request[i];
                    order.leverage = pos[i].leverage;
                    // convertAndSendBot(order.side, order, clientNumber)
                }
            }
        }
    }
}

export async function comparePosition(clientNumber: number, client: UnifiedMarginClient, curPos: Position[]): Promise<void> {
    // if (curPos.length === 0 && data.prePosition[clientNumber].length === 0) { return }
    const isBatch = true;
    if (firstGet[clientNumber]) {
        const myPos = await getMyPositions(client);
        if (myPos.retCode !== 0) {
            console.log('Client number ' + clientNumber + 'lỗi')
        }
        else {
            const listPos = myPos.result.list;
            if (listPos.length !== 0) {
                for (const pos of listPos) {
                    const posObj: Position = {
                        symbol: pos.symbol,
                        leverage: (parseInt(pos.leverage) * LEVERAGEBYBIT).toString(),
                        side: pos.side,
                        size: Math.floor(parseFloat(pos.size) * SIZEBYBIT).toString(),
                    }
                    data.prePosition[clientNumber].push(posObj);
                }
            }
            else {
                const batchOpenPos: BatchOrders = { category: "linear", request: [] };
                curPos.forEach(async pos => {
                    const order = await convertToOrder(client, pos, isBatch);
                    if (order !== undefined)
                        batchOpenPos.request.push(order);
                });
                await adjustLeverage(client, curPos);
                await openBatchOrders(clientNumber, client, batchOpenPos, curPos);
                data.prePosition[clientNumber] = curPos;
            }
        }
        firstGet[clientNumber] = false;
    }
    else {
        const findPositions = (pos1: Position[], pos2: Position[]): [Position[], Position[], Position[]] => {
            let closePos: Position[] = [];
            let openPos: Position[] = [];
            let samePos: Position[] = []
            if (curPos.length === 0) {
                closePos = pos1;
                openPos = [];
                samePos = [];
            } else {
                closePos = pos1.filter((p1) => !pos2.some((p2) => p1.symbol === p2.symbol && p1.side === p2.side));
                openPos = pos2.filter((p2) => !pos1.some((p1) => p1.symbol === p2.symbol && p1.side === p2.side));
                samePos = pos1.filter((p1) => pos2.some((p2) => p1.symbol === p2.symbol && p1.side === p2.side));
            }
            return [closePos, openPos, samePos];
        };
        const [closePos, openPos, samePos] = findPositions(data.prePosition[clientNumber], curPos);
        // console.log("find", closePos, openPos, samePos);
        if (closePos.length > 0) {
            // console.log('close', clientNumber, closePos);
            const batchClosePos: BatchOrders = { category: "linear", request: [] };
            closePos.forEach(async pos => {
                if (pos.side === 'Buy') { pos.side = 'Sell'; }
                else {
                    pos.side = 'Buy';
                    pos.size = (parseInt(pos.size) * -1).toString();
                }
                const order = await convertToOrder(client, pos, isBatch);
                if (order !== undefined)
                    batchClosePos.request.push(order);
            });
            await adjustLeverage(client, closePos);
            await openBatchOrders(clientNumber, client, batchClosePos, closePos);
        }
        if (openPos.length > 0) {
            // console.log('open', clientNumber, openPos);
            const batchOpenPos: BatchOrders = { category: "linear", request: [] };
            openPos.forEach(async pos => {
                const order = await convertToOrder(client, pos, isBatch);
                if (order !== undefined)
                    batchOpenPos.request.push(order);
            });
            await adjustLeverage(client, openPos);
            await openBatchOrders(clientNumber, client, batchOpenPos, openPos);
        }
        if (samePos.length > 0 && curPos.length > 0) {
            // console.log('same', clientNumber, samePos);
            const batchChangePos: BatchOrders = await compareSize(client, clientNumber, samePos, curPos);
            if (batchChangePos.request.length > 0) {
                await openBatchOrders(clientNumber, client, batchChangePos, samePos);
            }
        }
        data.prePosition[clientNumber] = curPos;
    }
}

async function compareSize(client: UnifiedMarginClient, clientNumber: number, samePos: Position[], curPos: Position[]) {
    const isBatch = true;
    const batchChangePos: BatchOrders = { category: "linear", request: [] };
    // console.log("compare", samePos);
    for (const pos of samePos) {
        const matchingPos = curPos.filter((prePos) => pos.symbol === prePos.symbol)[0];
        // console.log(clientNumber, "pos", pos, "matching", matchingPos);
        const matchPosSize = parseFloat(matchingPos.size);
        const posSize = (parseFloat(pos.size) < 0) ? parseFloat(pos.size) * -1 : parseFloat(pos.size);
        // console.log(posSize, matchPosSize, matchingPos.side);
        if (posSize !== matchPosSize) {
            const newPos: Position = {
                symbol: pos.symbol,
                side: pos.side,
                leverage: pos.leverage,
                size: Math.abs(posSize - matchPosSize).toString()
                //  parseInt((posSize - matchPosSize).toString()) < 0 ?
                //     (parseInt((posSize - matchPosSize).toString()) * -1).toString() : parseInt((posSize - matchPosSize).toString()).toString(),
            }
            if (posSize > matchPosSize) {
                newPos.side = pos.side === 'Sell' ? 'Buy' : 'Sell';
                const order = await convertToOrder(client, newPos, isBatch);
                if (order !== undefined)
                    batchChangePos.request.push(order);
            } else if (posSize < matchPosSize) {
                newPos.side = pos.side === 'Sell' ? 'Sell' : 'Buy';
                const order = await convertToOrder(client, newPos, isBatch);
                if (order !== undefined)
                    batchChangePos.request.push(order);
            }
        }
    }
    firstCompare[clientNumber] = false;
    return batchChangePos;
}

function convertAndSendBot(action: string, order, clientNumber: number) {
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