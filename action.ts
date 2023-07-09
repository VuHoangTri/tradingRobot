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
                // leverage: pos.leverageE2,
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

export function convertWagonFormat(position: any[]) {
    try {
        const res: Position[] = position.map(pos => {
            return {
                symbol: pos.symbol,
                size: Number(pos.positionAmount).toString(),
                // leverage: (pos.leverage * LEVERAGEBYBIT).toString(),
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
                // leverage: (pos.leverage * LEVERAGEBYBIT).toString(),
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
                // leverage: (pos.leverage * LEVERAGEBYBIT).toString(),
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
            // const filter = exchangeInfo.find(exch => exch.symbol === pos.contractCodeDisplayName);
            const sideConverter = pos.side === "long" ? 1 : -1;
            const size = (((Number(pos.amount) * Number(pos.unitAmount))) * sideConverter);
            pos.size = size.toString();
            return {
                symbol: pos.contractCodeDisplayName,
                size: pos.size,
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

export function convertOKXFormat(position: any[]) {
    const res: Position[] = position.map((pos) => {
        const symbol = pos.instId.split('-').join('').replace('SWAP', '');
        const sideConverter = pos.posSide === 'long' ? 1 : -1;
        const size = Number(pos.availSubPos) * sideConverter;
        return {
            symbol: symbol,
            size: size.toString(),
            pnl: pos.pnl,
            entry: pos.markPx
        }
    });
    return res;
}

export function consolidatePostion(pos: Position[]) {
    const result: Position[] = Object.values(pos.reduce((acc: Position | {}, obj) => {
        const { symbol, size, pnl, entry } = obj;
        if (!acc[symbol]) {
            acc[symbol] = {
                symbol,
                pnl: 0,
                size: 0,
                entry: 0
            };
        }
        acc[symbol].pnl += Number(pnl);
        acc[symbol].size += Number(size);
        acc[symbol].entry += Number(size) * Number(entry);
        return acc;
    }, {})).map((obj: Position) => {
        if (obj.entry) {
            obj.size = obj.size.toString();
            obj.entry = (Number(obj.entry) / Number(obj.size)).toString();
        }
        return obj;
    });
    return result;
}

export function convertToOrder(pos: Position, tP: boolean, price?: string) {
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
        // sendNoti(`${pos.symbol}, ${res.price}, ${price}, ${decimal}`);
        if (tP && price) {
            const priceSize = price.replace(/0+$/g, '');
            const decimal = priceSize.toString().split('.')[1]?.length ?? 0;
            const profitPercent = (newSide === 'Buy' ? 1 : -1) * 0.19;
            res.takeProfit = (Number(pos.entry) * (1 + profitPercent)).toFixed(decimal);
        }
        return res;
        // console.log(res);
    } catch (err: any) {
        sendNoti(`Convert to order error ${err}`);
        return null;
    }
}

function roundQuantity(size: string, minOrderQty: string, qtyStep: string) {
    try {
        const decimalLen = minOrderQty.toString().split('.')[1]?.length ?? 0;
        const s = Math.abs(Number(size));
        const mOQ = Number(minOrderQty);
        const qS = Number(qtyStep);
        const nearestMultiple = Math.max(mOQ, Math.round(s / qS) * qS);
        return (Number(size) < 0 ? -nearestMultiple : nearestMultiple).toFixed(decimalLen);
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
                // await trader.adjustLeverage(openPosFine);
                await openedPosition(openPosFine, trader);
            }
        }

        if (adjustPos.length > 0 || closePos.length > 0) {
            const myPos = await trader.getMyPositions();
            if (myPos) {
                const myList = myPos?.result.list.map((c: any) => {
                    return { symbol: c.symbol, size: c.size, entry: c.entryPrice }
                });
                if (closePos.length > 0 && myList.length > 0) {
                    const closeMyPos = myList.filter(pP =>
                        closePos.some(cP => cP.symbol === pP.symbol)
                    ) || [];
                    if (closeMyPos.length > 0)
                        await closedPosition(closeMyPos, trader);
                }

                if (adjustPos.length > 0) {
                    // const adjustedLeverage = adjustPos.filter(pP =>
                    //     trader._prePos.some(cP =>
                    //         cP.symbol === pP.symbol && Number(cP.leverage) !== (Number(pP.leverage))
                    //     )
                    // ) || [];
                    // if (adjustedLeverage.length > 0) {
                    //     // await trader.adjustLeverage(adjustedLeverage);
                    //     sendNoti(`Đã chỉnh đòn bẩy ${adjustedLeverage.map(c => c.symbol)}`);
                    // }
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
            const sizeConverter = (Number(pos.size) < 0 ? -1 : 1)
            // if (pos.symbol === 'BTCUSDT') continue;
            // if (trader._acc.fixAmount && trader._platform !== 'Binance') {
            //     pos.size = (sizeConverter * (((Number(pos.leverage) / 2) / LEVERAGEBYBIT) / Number(pos.entry))).toFixed(3).toString();
            // }
            // if (Math.abs(Number(pos.size)) < Number(lotSizeFilter.minOrderQty) || trader._platform === 'Binance') {
            pos.size = (sizeConverter * Number(lotSizeFilter.minOrderQty) * trader._acc.gain).toString();
            // } else {
            // pos.size = roundQuantity(pos.size, lotSizeFilter.minOrderQty, lotSizeFilter.qtyStep);
            // }
            const amount = Number(pos.size) * Number(price);
            await trader.transferMoney(true, Math.abs(amount).toString());
            const order = convertToOrder(pos, trader._acc.tP, price);
            // console.log(pos, order)
            if (order !== null) {
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
                // convertAndSendBot(trader._acc.index, order, "Open");
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
            const order = convertToOrder(pos, false)
            if (order !== null) {
                // sendNoti(`Close,${order.symbol},${trader._acc.index},${pos.entry},${price}`)
                const cancel = await trader.cancelOrder(order.symbol);
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
                await trader.transferMoney(false, (Number(price) * Number(order.qty)).toString());
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
                        }
                        const price = await trader.getMarkPrice(newPos.symbol);
                        if (Number(newPos.size) * Number(pos.size) > 0) {
                            // const diff_qty = Number(curPos.size) - Number(prePos.size);
                            // const curValue = Number(curPos.size) * Number(curPos.entry);
                            // const preValue = Number(prePos.size) * Number(prePos.entry);
                            // const diff_entry = Math.abs((curValue - preValue) / diff_qty).toString();
                            // newPos.entry = diff_entry;
                            const amount = Number(newPos.size) * Number(price);
                            await trader.transferMoney(true, Math.abs(amount).toString())
                            action = "DCA";
                        }
                        else {
                            action = "Take PNL";
                            newPos.entry = pos.entry;
                            const amount = Number(newPos.size) * Number(price);
                            await trader.transferMoney(false, Math.abs(amount).toString())
                        }
                        newPos.size = roundQuantity(newPos.size, filterSize.minOrderQty, filterSize.qtyStep);
                        const order = convertToOrder(newPos, false);
                        if (order !== null) {
                            // sendNoti(`${action},${order.symbol},${trader._acc.index},${pos.entry},${price}`);
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
                            // convertAndSendBot(trader._acc.index, order, action, price);
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
            + order.side + "," + order.qty;
        if (markPrice && (action === "Close" || action === "Take PNL")) {
            const pnl = (order.side === "Sell" ? 1 : -1) * (Number(markPrice) - Number(order.price)) * Number(order.qty);
            dataString += "," + pnl;
        }
        sendChatToBot(dataString);
    } catch (err: any) {
        sendNoti(`Send chatbot error: ${err}`)
    }
}
