import { LEVERAGEBYBIT, nodeFetchProxyArr } from "./constant";
import { ApiObject, Order, Position } from "./interface";
import { sendChatToBot, sendNoti } from "./slack";
import _ from 'lodash';
import { BybitAPI } from "./bybit";
import { bot } from "./main";

export function changeIndexProxy() {
    try {
        const temp = nodeFetchProxyArr.splice(0, 1)[0];
        // console.log(temp);
        nodeFetchProxyArr.push(temp);
    }
    catch (err) {
        sendNoti('Change Index Proxy Fail');
    }
}

export function convertByBitFormat(position: ApiObject[]) {
    try {
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


export function convertBinanceFormat(gain, position: any[]) {
    try {
        const res: Position[] = position.map(pos => {
            return {
                symbol: pos.symbol,
                size: (Number(pos.amount) / gain).toFixed(3).toString(),
                leverage: (pos.leverage * LEVERAGEBYBIT).toString(),
                pnl: pos.pnl,
            }
        });
        return res;
    }
    catch (err) {
        sendNoti(`Convert Binance Fail ${err}`);
        return undefined;
    }
}

export function convertMEXCFormat(markPrice: number[], gain: number, position: any[]) {
    try {
        const res: Position[] = position.map((pos, index) => {
            const price = markPrice[index];
            const entry = pos.openAvgPrice;
            const sideConverter = pos.positionType === 1 ? 1 : -1;
            const unPNL = (price - entry) * sideConverter;
            return {
                symbol: pos.symbol.split('_').join(''),
                size: (sideConverter * (Number(pos.amount) / gain)).toFixed(3).toString(),
                leverage: (pos.leverage * LEVERAGEBYBIT).toString(),
                pnl: unPNL
            }
        });
        return res;
    }
    catch (err) {
        sendNoti(`Convert MEXC Fail ${err}`);
        return undefined;
    }
}

export function convertHotCoinFormat(exchangeInfo, gain: number, position: any[]) {
    try {
        const res: Position[] = position.map(pos => {
            const filter = exchangeInfo.find(exch => exch.symbol === pos.contractCodeDisplayName);
            const sideConverter = pos.side === "short" ? -1 : 1;
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
    catch (err) {
        sendNoti(`Convert HotCoin Fail ${err}`);
        return undefined;
    }
}

export function convertToOrder(pos: Position, limit: boolean) {
    try {
        const newSide = Number(pos.size) < 0 ? 'Sell' : 'Buy';
        const res: Order = {
            symbol: pos.symbol,
            category: 'linear',
            orderType: 'Market',
            qty: Math.abs(Number(pos.size)).toString(),
            side: newSide,
            timeInForce: 'GoodTillCancel',
        };
        if (limit && pos.entry) {
            res.orderType = 'Limit';
            res.price = Number(pos.entry).toFixed(3)
        }
        // console.log(res);
        return res;
    } catch (err: any) {
        sendNoti(err);
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
                const myList = myPos?.result.list.map((c: Position) => {
                    return { symbol: c.symbol, size: c.size, leverage: (Number(c.leverage) * LEVERAGEBYBIT).toString() }
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
                        await adjustPosition(adjustMyPost, trader);
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
            const filter = trader._exchangeInfo.find(exch => exch.symbol === pos.symbol);
            const lotSizeFilter = filter.lotSizeFilter;
            pos.size = roundQuantity(pos.size, lotSizeFilter.minOrderQty, lotSizeFilter.qtyStep);
            const order = convertToOrder(pos, trader._acc.limit);
            if (order !== null) {
                order.leverage = pos.leverage;
                let response = await trader.createOrder(order);
                let count = 1;
                while (response?.retCode !== 0 && count < 5) {
                    sendNoti(`Open ${order.symbol} acc ${trader._acc.index}: ${count} times`)
                    await new Promise((r) => setTimeout(r, 1000));
                    response = await trader.createOrder(order);
                    count++;
                }
                if (count >= 5) {
                    sendNoti(`Open ${order.symbol} acc ${trader._acc.index}: Error ${response?.retMsg}`);
                    bot.enabled = false;
                    return;
                }
                order.price = await trader.getMarkPrice(order.symbol);
                convertAndSendBot(order, trader._acc.botChat, "Open");
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
            const order = convertToOrder(pos, false)
            if (order !== null) {
                let response = await trader.createOrder(order);
                let count = 1;
                while (response?.retCode !== 0 && count < 5) {
                    sendNoti(`Close ${order.symbol} acc ${trader._acc.index}: ${count} times`);
                    await new Promise((r) => setTimeout(r, 1000));
                    response = await trader.createOrder(order);
                    count++;
                }
                if (count >= 5) {
                    sendNoti(`Close ${order.symbol} acc ${trader._acc.index}: Error ${response?.retMsg}`);
                    bot.enabled = false;
                    return;
                }
                order.price = await trader.getMarkPrice(order.symbol);
                convertAndSendBot(order, trader._acc.botChat, "Close");
            }

        }
    }
    catch (err) {
        sendNoti(`Create close pos error ${trader._acc.index}: ${err}`);
    }
}

export async function adjustPosition(position: Position[], trader: BybitAPI) {
    try {
        const orders: any = [];
        if (trader._curPos !== undefined) {
            let action = "";
            for await (const pos of position) {
                const prePos = trader._prePos.find(c => c.symbol === pos.symbol);
                const curPos = trader._curPos.find(c => c.symbol === pos.symbol);
                if (prePos && curPos) {
                    const filter = trader._exchangeInfo.find(exch => exch.symbol === pos.symbol);
                    if (filter !== undefined) {
                        const filterSize = filter.lotSizeFilter;
                        const percent = Number(curPos.size) / Number(prePos.size);
                        const newPos: Position = {
                            symbol: pos.symbol,
                            size: (Number(pos.size) * percent - Number(pos.size)).toString(),
                            leverage: pos.leverage
                        }
                        if (Number(newPos.size) * Number(pos.size) > 0) action = "DCA"
                        else action = "Take PNL";
                        newPos.size = roundQuantity(newPos.size, filterSize.minOrderQty, filterSize.qtyStep);
                        const order = convertToOrder(newPos, false);
                        if (order !== null) {
                            order.leverage = newPos.leverage;
                            let response = await trader.createOrder(order);
                            let count = 1;
                            while (response?.retCode !== 0 && count < 5) {
                                sendNoti(`Adjust ${order.symbol} acc ${trader._acc.index}: ${count} times`);
                                await new Promise((r) => setTimeout(r, 1000));
                                response = await trader.createOrder(order);
                                count++;
                            }
                            if (count >= 5) {
                                sendNoti(`Close ${order.symbol} acc ${trader._acc.index}: Error ${response?.retMsg}`);
                                bot.enabled = false;
                            }
                            order.price = await trader.getMarkPrice(order.symbol);
                            convertAndSendBot(order, trader._acc.botChat, action);
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

export function convertAndSendBot(order, botChat: string, action: string) {
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
            + order.leverage + "\nSize: " + order.qty;
        sendChatToBot(icon, dataString, botChat);
    } catch (err: any) {
        sendNoti(`Send chatbot error: ${err}`)
    }
}
