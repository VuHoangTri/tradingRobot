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

export function convertWagonFormat(clientNumber, position: any[]) {
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol,
            size: (Number(pos.positionAmount) / gain[clientNumber]).toFixed(3).toString(),
            leverage: (pos.leverage * LEVERAGEBYBIT).toString()
        }
    });
    // await Promise.resolve();
    return res;
}

export function convertBinanceFormat(clientNumber: number, position: any[]) {
    // console.log(35, clientNumber);
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol,
            // side: parseFloat(pos.amount) > 0 ? "Buy" : "Sell",
            size: (Number(pos.amount) / gain[clientNumber]).toFixed(3).toString(),
            leverage: (pos.leverage * LEVERAGEBYBIT).toString()
        }
    });
    // await Promise.resolve();
    return res;
}

export async function convertToOrder(client: UnifiedMarginClient, pos: Position, isBatch: boolean) {
    const price = await getMarkPrice(client, pos.symbol);
    // console.log(price);
    if (price === 'error') return undefined;
    let newPrice = '';
    if (pos.side === 'Buy') {
        newPrice = ((Number(price) * 1.1)).toFixed(3).toString()
    } else {
        newPrice = (Number(price) * 0.9).toFixed(3).toString()
    }
    const res: Order = {
        symbol: pos.symbol,
        orderType: 'Limit',
        qty: (Number(pos.size)).toString(),
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
    for await (const pos of positions) {
        const lever = (Number(pos.leverage) / LEVERAGEBYBIT).toString();
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

export async function comparePosition(clientNumber: number, client: UnifiedMarginClient, curPos: Position[]): Promise<void> {
    // if (curPos.length === 0 && data.prePosition[clientNumber].length === 0) { return }
    const isBatch = true;
    if (firstGet[clientNumber]) {
        const myPos = await getMyPositions(client);
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
        const openPos = _.differenceWith(curPos, data.prePosition[clientNumber], function (source: any, dest: any) {
            return source.symbol === dest.symbol;
        });
        const closePos = _.differenceWith(data.prePosition[clientNumber], curPos, function (source: any, dest: any) {
            return source.symbol === dest.symbol;
        });
        const adjustPos = _.differenceWith(data.prePosition[clientNumber], curPos, function (source: any, dest: any) {
            // console.log(128, "source", source, "dest", dest, ((source.symbol === dest.symbol) && (Number(source.size)) === Number(dest.size)));
            return (source.symbol === dest.symbol) && ((Number(source.size)) === Number(dest.size));
        });
        // console.log(131, "open", openPos, "close", closePos, "adjust", adjustPos);

        if (closePos.length > 0) {
            const batchClosePos: BatchOrders = { category: "linear", request: [] };
            // console.log(closePos);
            for await (const pos of closePos) {
                // console.log(132, Number(pos.size) > 0);
                if (Number(pos.size) > 0) {
                    pos.side = 'Sell';
                    pos.size = (Number(pos.size)).toString();
                }
                else {
                    pos.side = 'Buy';
                    pos.size = (Number(pos.size) * -1).toString();
                }
                const order = await convertToOrder(client, pos, isBatch);
                if (order !== undefined)
                    batchClosePos.request.push(order);
            }
            await openBatchOrders(clientNumber, client, batchClosePos, closePos);
        }

        if (openPos.length > 0) {
            const batchOpenPos: BatchOrders = { category: "linear", request: [] };
            for await (const pos of openPos) {
                if (Number(pos.size) > 0) {
                    pos.side = 'Buy';
                    pos.size = (Number(pos.size)).toString();
                }
                else {
                    pos.side = 'Sell';
                    pos.size = (Number(pos.size) * -1).toString();
                }
                const order = await convertToOrder(client, pos, isBatch);
                // console.log(161, order)
                if (order !== undefined)
                    batchOpenPos.request.push(order);
            }
            await adjustLeverage(client, openPos);
            await openBatchOrders(clientNumber, client, batchOpenPos, openPos);
        }


        if (adjustPos.length > 0 && curPos.length > 0) {
            // console.log('same', clientNumber, samePos);
            const batchChangePos: BatchOrders = await compareSize(client, clientNumber, adjustPos, curPos);
            if (batchChangePos.request.length > 0) {
                await openBatchOrders(clientNumber, client, batchChangePos, adjustPos);
            }
        }
        data.prePosition[clientNumber] = curPos;
    }
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
        if (Math.abs(matchPosSize / posSize) > 1) {
            if (posSize > 0) {
                newPos.side = posSize > 0 ? 'Buy' : 'Sell';
            } else {
                newPos.side = posSize > 0 ? 'Buy' : 'Sell';
            }
        } else if (Math.abs(matchPosSize / posSize) < 1) {
            if (posSize > 0) {
                newPos.side = "Sell";
            } else {
                newPos.side = "Buy";
            }
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
