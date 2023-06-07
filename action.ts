import { LEVERAGEBYBIT, SIZEBYBIT, axiosProxyArr } from "./constant";
import { ApiObject, Order, Position } from "./interface";
import { sendChatToBot, sendNoti } from "./slack";
import _ from 'lodash';
import { BybitAPI } from "./bybit";

export function changeIndexProxy() {
    try {
        // const temp = nodeFetchProxyArr.splice(0, 1)[0];
        // nodeFetchProxyArr.push(temp);
        const temp = axiosProxyArr.splice(0, 1)[0];
        axiosProxyArr.push(temp);
    }
    catch (err) {
        sendNoti('Change Index Proxy Fail');
    }
}

export function convertByBitFormat(markPrice: number[], position: ApiObject[]) {
    try {
        const res: Position[] = position.map((pos, index) => {
            const sideConverter = pos.side === "Sell" ? -1 : 1;
            const unPNL = (markPrice[index] - Number(pos.entryPrice)) * sideConverter;
            return {
                symbol: pos.symbol,
                side: pos.side,
                size: (Number(pos.sizeX) * sideConverter / SIZEBYBIT).toString(),
                leverage: pos.leverageE2,
                entry: pos.entryPrice,
                pnl: unPNL
            }
        });
        return res;
    }
    catch (err) {
        sendNoti(`Convert Bybit Fail ${err}`);
        return undefined;
    }
}

export function convertWagonFormat(gain: number, position: any[]) {
    try {
        const res: Position[] = position.map(pos => {
            return {
                symbol: pos.symbol,
                size: (Number(pos.positionAmount) / gain).toFixed(3).toString(),
                leverage: (pos.leverage * LEVERAGEBYBIT).toString(),
                pnl: Number(pos.unrealizedProfit),
                entry: pos.entryPrice
            }
        });
        return res;
    }
    catch (err) {
        sendNoti(`Convert Wagon Fail ${err}`);
        return undefined;
    }
}


export function convertBinanceFormat(position: any[]) {
    try {
        const res: Position[] = position.map(pos => {
            return {
                symbol: pos.symbol,
                size: (Number(pos.amount)).toFixed(3).toString(),
                leverage: (pos.leverage * LEVERAGEBYBIT).toString(),
                pnl: Number(pos.pnl),
                entry: pos.entryPrice.toFixed(5).toString(),
            }
        });
        return res;
    }
    catch (err) {
        sendNoti(`Convert Binance Fail ${err}`);
        return undefined;
    }
}

export function convertMEXCFormat(markPrice: number[], position: any[]) {
    try {
        const res: Position[] = position.map((pos, index) => {
            const price = markPrice[index];
            const entry = pos.openAvgPrice;
            const sideConverter = pos.positionType === 1 ? 1 : -1;
            const unPNL = (price - entry) * sideConverter;
            return {
                symbol: pos.symbol.split('_').join(''),
                size: (sideConverter * (Number(pos.amount))).toFixed(3).toString(),
                leverage: (pos.leverage * LEVERAGEBYBIT).toString(),
                pnl: unPNL,
                entry: price.toString(),
            }
        });
        return res;
    }
    catch (err) {
        sendNoti(`Convert MEXC Fail ${err}`);
        return undefined;
    }
}

export function convertHotCoinFormat(exchangeInfo, position: any[]) {
    try {
        const res: Position[] = position.map(pos => {
            const filter = exchangeInfo.find(exch => exch.symbol === pos.contractCodeDisplayName);
            const sideConverter = pos.side === "long" ? 1 : -1;
            const size = (((Number(pos.amount) * Number(pos.unitAmount))) * sideConverter);
            pos.size = pos.lever > filter.leverageFilter.maxLeverage
                ? (size * (Number(pos.lever) / Number(filter.leverageFilter.maxLeverage))).toString()
                : size.toString()
            // sendNoti(`Side ${pos.side} and Size ${pos.size} `);
            return {
                symbol: pos.contractCodeDisplayName,
                size: Number(pos.size).toFixed(3).toString(),
                leverage: (pos.lever * LEVERAGEBYBIT).toString(),
                entry: pos.price,
                pnl: Number(pos.unRealizedSurplus),
            }
        });
        return res;
    }
    catch (err) {
        sendNoti(`Convert HotCoin Fail ${err}`);
        return undefined;
    }
}

export function convertToOrder(pos: Position, limit: boolean, tP: boolean, price?: string) {
    try {
        const newSide = Number(pos.size) < 0 ? 'Sell' : 'Buy';
        const res: Order = {
            symbol: pos.symbol,
            category: 'linear',
            orderType: 'Market',
            qty: Math.abs(Number(pos.size)).toString(),
            side: newSide,
            timeInForce: 'GTC',//GoodTillCancel',
        };
        if (limit && price) {
            const priceSize = price.replace(/0+$/g, '');
            const decimal = priceSize.toString().split('.')[1]?.length ?? 0;
            res.orderType = 'Limit';
            res.price = Number(pos.entry).toFixed(decimal).toString();
            // sendNoti(`${pos.symbol}, ${res.price}, ${price}, ${decimal}`);
            if (tP) {
                const profitPercent = (newSide === 'Buy' ? 1 : -1) * 0.19;
                res.takeProfit = (Number(pos.entry) * (1 + profitPercent)).toFixed(decimal);
            }
        }
        // console.log(res);
        return res;
    } catch (err: any) {
        sendNoti(`Convert to order error ${err}`);
        return null;
    }
}

function roundQuantity(size, minOrderQty, qtyStep) {
    try {
        const decimalLen = minOrderQty.toString().split('.')[1]?.length ?? 0;
        const s = Math.abs(Number(size));
        const mOQ = Number(minOrderQty);
        const qS = Number(qtyStep);
        const nearestMultiple = Math.max(mOQ, Math.round(s / qS) * qS);
        return (size < 0 ? -nearestMultiple : nearestMultiple).toFixed(decimalLen);
    } catch (err) {
        sendNoti(`Round Quantity error ${err}`);
        return '';
    }
}

export function comparePosition(compare: { firstGet: boolean, curPos: Position[] | undefined, prePos: Position[] }) {
    try {
        const { firstGet, curPos, prePos } = compare;
        if (curPos !== undefined) {
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
        }
        return { openPos: [], closePos: [], adjustPos: [] }
    } catch (err) {
        sendNoti(`Compare error: ${err}`)
        return { openPos: [], closePos: [], adjustPos: [] }
    }
}

export async function actuator(diffPos: { openPos: Position[], closePos: Position[], adjustPos: Position[] }, trader: BybitAPI) {
    try {
        const { openPos, closePos, adjustPos } = diffPos;

        if (openPos.length > 0) {
            const openPosFine = _.cloneDeep(openPos.filter((c: any) => trader._exchangeInfo.some((x: any) => c.symbol === x.symbol)) || []);
            if (openPosFine.length > 0) {
                await trader.adjustLeverage(openPosFine);
                await openedPosition(openPosFine, trader);
            }
        }

        if (adjustPos.length > 0 || closePos.length > 0) {
            const myPos = await trader.getMyPositions();
            if (myPos) {
                const myList = myPos?.result.list.map((c: any) => {
                    return { symbol: c.symbol, size: c.size, leverage: (Number(c.leverage) * LEVERAGEBYBIT).toString(), entry: c.entryPrice }
                });
                if (closePos.length > 0 && myList.length > 0) {
                    const closeMyPos = myList.filter(pP =>
                        closePos.some(cP => cP.symbol === pP.symbol)
                    ) || [];
                    if (closeMyPos.length > 0)
                        await closedPosition(closeMyPos, trader);
                }

                if (adjustPos.length > 0) {
                    const adjustedLeverage = adjustPos.filter(pP =>
                        trader._prePos.some(cP =>
                            cP.symbol === pP.symbol && Number(cP.leverage) !== (Number(pP.leverage))
                        )
                    ) || [];
                    if (adjustedLeverage.length > 0) {
                        await trader.adjustLeverage(adjustedLeverage);
                        sendNoti(`Đã chỉnh đòn bẩy ${adjustedLeverage.map(c => c.symbol)}`);
                    }
                    const adjustMyPost = myList.filter(pP =>
                        adjustPos.some(cP => cP.symbol === pP.symbol)
                    ) || [];
                    if (adjustMyPost.length > 0)
                        await adjustedPosition(adjustMyPost, trader);
                }
            }
        }
    } catch (err) {
        sendNoti(`Actuator Err Acc: ${trader._acc.index}`);
    }
}

export async function openedPosition(position: Position[], trader: BybitAPI) {
    try {
        for await (const pos of position) {
            const price = await trader.getMarkPrice(pos.symbol);
            const filter = trader._exchangeInfo.find(exch => exch.symbol === pos.symbol);
            const lotSizeFilter = filter.lotSizeFilter;
            if (trader._acc.fixAmount) {
                pos.size = (((Number(pos.size) < 0 ? -1 : 1) * ((Number(pos.leverage) / 2) / LEVERAGEBYBIT) / Number(pos.entry))).toFixed(3).toString();
            }
            if (Number(pos.size) < Number(lotSizeFilter.minOrderQty)) {
                pos.size = lotSizeFilter.minOrderQty.toString();
            } else {
                pos.size = roundQuantity(pos.size, lotSizeFilter.minOrderQty, lotSizeFilter.qtyStep);
            }
            const order = convertToOrder(pos, trader._acc.limit, trader._acc.tP, price);
            // console.log(pos, order)
            if (order !== null) {
                order.leverage = pos.leverage;
                let response = await trader.createOrder(order);
                let count = 1;
                while (response?.retCode !== 0 && count < 3) {
                    sendNoti(`Open ${order.symbol} acc ${trader._acc.index}: ${count} times`)
                    await new Promise((r) => setTimeout(r, 2000));
                    response = await trader.createOrder(order);
                    count++;
                }
                if (count >= 3) {
                    sendNoti(`Open ${order.symbol} acc ${trader._acc.index}: Error ${response?.retMsg} \n Stop trader: please check and restart!`);
                    // trader._isRun = false;
                    continue;
                    // return;
                }
                order.price = pos.entry;
                convertAndSendBot(trader._acc.index, order, "Open");
            }
        }
    }
    catch (err) {
        sendNoti(`Create open pos error ${trader._acc.index}: ${err}`);
    }
}

export async function closedPosition(position: Position[], trader: BybitAPI) {
    try {
        for await (const pos of position) {
            pos.size = (Number(pos.size) * -1).toString();
            const price = await trader.getMarkPrice(pos.symbol);
            const order = convertToOrder(pos, false, false)
            if (order !== null) {
                sendNoti(`Close,${order.symbol},${trader._acc.index},${pos.entry},${price}`)
                let response = await trader.createOrder(order);
                let count = 1;
                while (response?.retCode !== 0 && count < 3) {
                    sendNoti(`Close ${order.symbol} acc ${trader._acc.index}: ${count} times`);
                    await new Promise((r) => setTimeout(r, 2000));
                    response = await trader.createOrder(order);
                    count++;
                }
                if (count >= 3) {
                    sendNoti(`Close ${order.symbol} acc ${trader._acc.index}: Error ${response?.retMsg} \n Stop trader: please check and restart!`);
                    // trader._isRun = false; // tạm thời không dừng
                    continue;
                }
                order.price = pos.entry;
                order.leverage = pos.leverage;
                convertAndSendBot(trader._acc.index, order, "Close", price);
            }

        }
    }
    catch (err) {
        sendNoti(`Create close pos error ${trader._acc.index}: ${err}`);
    }
}

export async function adjustedPosition(position: Position[], trader: BybitAPI) {
    try {
        if (trader._curPos !== undefined) {
            let action = "";
            for await (const pos of position) {
                const prePos = trader._prePos.find(c => c.symbol === pos.symbol);
                const curPos = trader._curPos.find(c => c.symbol === pos.symbol);
                if (prePos && curPos) {
                    const filter = trader._exchangeInfo.find(exch => exch.symbol === pos.symbol);
                    if (filter !== undefined) {
                        const filterSize = filter.lotSizeFilter;
                        let percent = Number(curPos.size) / Number(prePos.size);
                        if (trader._acc.limitPercent)
                            percent = percent > 1.2 ? 1.2 : percent;
                        const newPos: Position = {
                            symbol: pos.symbol,
                            size: (Number(pos.size) * percent - Number(pos.size)).toString(),
                            leverage: pos.leverage
                        }
                        const price = await trader.getMarkPrice(newPos.symbol);
                        if (Number(newPos.size) * Number(pos.size) > 0) {
                            const diff_qty = Number(curPos.size) - Number(prePos.size);
                            const curValue = Number(curPos.size) * Number(curPos.entry);
                            const preValue = Number(prePos.size) * Number(prePos.entry);
                            const diff_entry = Math.abs((curValue - preValue) / diff_qty).toString();
                            newPos.entry = diff_entry;
                            action = "DCA";
                        }
                        else action = "Take PNL";
                        newPos.size = roundQuantity(newPos.size, filterSize.minOrderQty, filterSize.qtyStep);
                        const order = convertToOrder(newPos, trader._acc.limit, false, price);
                        if (order !== null) {
                            order.leverage = newPos.leverage;
                            sendNoti(`${action},${order.symbol},${trader._acc.index},${pos.entry},${price}`);
                            let response = await trader.createOrder(order);
                            let count = 1;
                            while (response?.retCode !== 0 && count < 3) {
                                sendNoti(`Adjust ${order.symbol} acc ${trader._acc.index}: ${count} times`);
                                await new Promise((r) => setTimeout(r, 2000));
                                response = await trader.createOrder(order);
                                count++;
                            }
                            if (count >= 3) {
                                sendNoti(`Adjust ${order.symbol} acc ${trader._acc.index}: Error ${response?.retMsg} \n Stop trader: please check and restart!`);
                                // trader._isRun = false;
                                continue;
                            }
                            order.price = newPos.entry;
                            convertAndSendBot(trader._acc.index, order, action, price);
                        }
                    }
                }
            }
        }
    }
    catch (err) {
        sendNoti(`Create adjust pos error ${err}`);
    }
}

export function convertAndSendBot(index, order, action: string, markPrice?: string) {
    try {
        let dataString = '';
        dataString = "Account" + index + "," + action + "," + order.symbol + "," + order.price + ","
            + order.side + "," + (Number(order.leverage) / LEVERAGEBYBIT) + "," + order.qty;
        if (markPrice && (action === "Close" || action === "Take PNL")) {
            const pnl = (order.side === "Sell" ? 1 : -1) * (Number(markPrice) - Number(order.price)) * Number(order.size);
            dataString += "," + pnl;
        }
        sendChatToBot(dataString);
    } catch (err: any) {
        sendNoti(`Send chatbot error: ${err}`)
    }
}
