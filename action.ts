// import { RequestInit } from "node-fetch";
// import { createBatchOrders, createOrder, getClosedPNL, getMarkPrice, getMyPositions, getTradeFee, setLeverage } from "./bybit";
import { LEVERAGEBYBIT } from "./constant";
import { ApiObject, BatchOrders, Leverage, Order, Position } from "./interface";
// import { data, firstGet, } from "./main";
import { sendChatToBot, sendError } from "./slack";
import _ from 'lodash';
import { BybitAPI } from "./bybit";
// import { UnifiedMarginClient } from "bybit-api";
// import fetch from "node-fetch";

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

export function convertWagonFormat(gain: number, position: any[]) {
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol,
            size: (Number(pos.positionAmount) / gain).toFixed(3).toString(),
            leverage: (pos.leverage * LEVERAGEBYBIT).toString()
        }
    });
    return res;
}

export function convertBinanceFormat(gain, position: any[]) {
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol,
            size: (Number(pos.amount) / gain).toFixed(3).toString(),
            leverage: (pos.leverage * LEVERAGEBYBIT).toString()
        }
    });
    return res;
}

export function convertMEXCFormat(gain: number, position: any[]) {
    const res: Position[] = position.map(pos => {
        return {
            symbol: pos.symbol.split('_').join(''),
            size: (Number(pos.amount) / gain).toFixed(3).toString(),
            leverage: (pos.leverage * LEVERAGEBYBIT).toString()
        }
    });
    return res;
}

export function convertHotCoinFormat(exchangeInfo, gain: number, position: any[]) {
    const res: Position[] = position.map(pos => {
        const filter = exchangeInfo.find(exch => exch.symbol === pos.contractCodeDisplayName);
        let sideConverter = 1;
        if (pos.side === "short") sideConverter = -1;
        const size = (((Number(pos.openMargin) * pos.lever / Number(pos.price)) / gain) * sideConverter);
        pos.size = pos.lever > filter.leverageFilter.maxLeverage
            ? (size * (Number(pos.lever) / Number(filter.leverageFilter.maxLeverage))).toString()
            : size
        return {
            symbol: pos.contractCodeDisplayName,
            size: Number(pos.size).toFixed(3).toString(),
            leverage: (pos.lever * LEVERAGEBYBIT).toString()
        }
    });
    return res;
}

export

    function convertToOrder(pos: Position, isBatch: boolean) {
    try {
        // const price = await this.getMarkPrice(pos.symbol);
        const newSide = Number(pos.size) < 0 ? 'Sell' : 'Buy';
        // let newPrice = '';
        // if (newSide === 'Buy') {
        //     newPrice = ((Number(price) * 1.1)).toFixed(3).toString()
        // } else {
        //     newPrice = (Number(price) * 0.9).toFixed(3).toString()
        // }
        const res: Order = {
            symbol: pos.symbol,
            orderType: 'Market',
            qty: Math.abs(Number(pos.size)).toString(),
            side: newSide,
            // price: newPrice,
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

// export async function openBatchOrders(batchOrders: BatchOrders, pnl: boolean) {
//     try {
//         if (batchOrders.request.length > 0) {
//             for (let i = 0; i < batchOrders.request.length; i += 9) {
//                 const chunkBatchOrders: BatchOrders = _.cloneDeep(batchOrders);
//                 chunkBatchOrders.request = chunkBatchOrders.request.slice(i, i + 9);
//                 const resCreate = await submitBatchOrders(client, chunkBatchOrders);
//                 for (let i = 0; i < resCreate.result.list.length; i++) {
//                     if (resCreate.retCode === 0 && resCreate.result.list[i].orderId !== '') {
//                         const order = batchOrders.request[i];
//                         let actualPNL = "";
//                         if (pnl === true) {
//                             const res = await getClosedPNL({ symbol: order.symbol, limit: 1 });
//                             if (typeof res !== 'string')
//                                 actualPNL = res.list[0].closedPnl;
//                         }
//                         convertAndSendBot(order.side, order, clientNumber, actualPNL);
//                     }
//                 }
//             }
//         }
//     } catch (err: any) {
//         sendError(err);
//     }
// }

function roundQuantity(size, minOrderQty, qtyStep) {
    const decimalLen = minOrderQty.toString().split('.')[1]?.length ?? 0;
    const s = Math.abs(Number(size));
    const mOQ = Number(minOrderQty);
    const qS = Number(qtyStep);
    const nearestMultiple = Math.max(mOQ, Math.round(s / qS) * qS);
    return (size < 0 ? -nearestMultiple : nearestMultiple).toFixed(decimalLen);
}

export async function comparePosition(compare: { firstGet: boolean, curPos: Position[], prePos: Position[] }) {
    try {
        const { firstGet, curPos, prePos } = compare;
        const openPos: Position[] = _.differenceBy(curPos, prePos, 'symbol');
        const closePos: Position[] = _.differenceBy(prePos, curPos, 'symbol');
        let adjustPos: Position[] = [];
        if (firstGet !== true) {
            adjustPos = curPos.filter(pP =>
                prePos.some(cP =>
                    cP.symbol === pP.symbol && Number(cP.size) !== Number(pP.size)
                )
            ) || [];
        }
        return { openPos: openPos, closePos: closePos, adjustPos: adjustPos }
    } catch (err) {
        sendError(`Compare error: ${err}`)
    }
}

export function openedPosition(position: Position[], trader: BybitAPI) {
    try {
        const batchOpenPos: BatchOrders = { category: "linear", request: [] };
        console.log("Cur and Pre Position - Open ", trader._prePos, trader._curPos);
        for (const pos of position) {
            const filter = trader._exchangeInfo.find(exch => exch.symbol === pos.symbol);
            const lotSizeFilter = filter.lotSizeFilter;
            pos.size = roundQuantity(pos.size, lotSizeFilter.minOrderQty, lotSizeFilter.qtyStep);
            const order = convertToOrder(pos, true);
            console.log("Action Open", order, new Date());
            if (order !== null) {
                order.leverage = pos.leverage;
                batchOpenPos.request.push(order);
            }
        }
        return batchOpenPos;
    }
    catch (err) {
        sendError(`Create adjust pos error ${err}`);
        const batchEmpty: BatchOrders = { category: "linear", request: [] };
        return batchEmpty
    }
}

export function closedPosition(position: Position[], trader: BybitAPI) {
    try {
        const batchClosePos: BatchOrders = { category: "linear", request: [] };
        console.log("Cur Position - Close", trader._curPos);
        for (const pos of position) {
            const filter = trader._exchangeInfo.find(exch => exch.symbol === pos.symbol);
            if (filter !== undefined) {
                pos.size = (Number(pos.size) * -1).toString();
                const order = convertToOrder(pos, true)
                console.log("Action Close", order, new Date());
                if (order !== null)
                    batchClosePos.request.push(order);
            }
        }
        return batchClosePos;
    }
    catch (err) {
        sendError(`Create adjust pos error ${err}`);
        const batchEmpty: BatchOrders = { category: "linear", request: [] };
        return batchEmpty
    }
}

export async function adjustPosition(position: Position[], trader: BybitAPI) {
    try {
        const batchAdjustPos: BatchOrders = { category: "linear", request: [] };
        console.log('Cur and Pre Position - Adjust', trader._prePos, trader._curPos);
        let pnl = true;
        for await (const pos of position) {
            const prePos = trader._prePos.find(c => c.symbol === pos.symbol);
            if (prePos) {
                const filter = trader._exchangeInfo.find(exch => exch.symbol === pos.symbol);
                if (filter !== undefined && prePos !== undefined) {
                    const filterSize = filter.lotSizeFilter;
                    const percent = Number(pos.size) / Number(prePos.size);
                    const myPos = await trader.getMyPositions();
                    const adjustedPos = myPos.result.list.filter(c => c.symbol === pos.symbol) || [];
                    if (adjustedPos.length > 0) {
                        const newPos: Position = {
                            symbol: pos.symbol,
                            size: (Number(adjustedPos[0].size) * percent - Number(adjustedPos[0].size)).toString(),
                            leverage: pos.leverage
                        }
                        if (Number(newPos.size) * Number(adjustedPos[0].size) > 0) pnl = false
                        else pnl = true;
                        newPos.size = roundQuantity(newPos.size, filterSize.minOrderQty, filterSize.qtyStep);
                        const order = convertToOrder(newPos, true);
                        console.log("Action Adjust", order, new Date())
                        if (order !== null) {
                            order.leverage = newPos.leverage;
                            batchAdjustPos.request.push(order);
                        }
                    }
                }
            }
        }
        return { batch: batchAdjustPos, pnl };
    }
    catch (err) {
        console.log(err);
        sendError(`Create adjust pos error ${err}`);
        const batchEmpty: BatchOrders = { category: "linear", request: [] };
        return { batch: batchEmpty, pnl: false }
    }
}

export function convertAndSendBot(action: string | undefined, order, clientNumber: number, pnl: string) {
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

// export async function getTotalPnL(nextPageCursor?: string) {
//     let res = await getClosedPNL({ cursor: nextPageCursor });
//     let sum = 0;
//     while (typeof res !== 'string' && res.nextPageCursor !== '') {
//         sum = sum + res.list.reduce((acc, cur) => acc + Number(cur.closedPnl), 0);
//         res = await getClosedPNL({ cursor: res.nextPageCursor })
//     }
//     return sum;
// }

// export async function getTotalTradeFee(nextPageCursor?: string) {
//     let res = await getTradeFee({ cursor: nextPageCursor });
//     let sum = 0;
//     let length = 0;
//     while (typeof res !== 'string' && Boolean(res.nextPageCursor)) {
//         length = length + res.list.length;
//         sum = sum + res.list.reduce((acc, cur) => acc + Number(cur.fee), 0);
//         res = await getTradeFee({ cursor: res.nextPageCursor })
//     }
//     return sum;
// }