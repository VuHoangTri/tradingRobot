import { createBatchOrders, createOrder, getMarkPrice, getMyPositions, setLeverage } from "./bybit";
import { LEVERAGEBYBIT, SIZEBYBIT } from "./constant";
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

export function convertToOrder(pos: Position, isBatch: boolean) {
    const res: Order = {
        symbol: pos.symbol,
        orderType: 'Market',
        qty: (parseInt(pos.size) / SIZEBYBIT).toString(),
        side: pos.side,
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
export async function openBatchOrders(client: UnifiedMarginClient, batchOrders: BatchOrders) {

    const resCreate = await createBatchOrders(client, batchOrders);
    // const order = _.cloneDeep(pos);
    // order.entryPrice = await getMarkPrice(client, pos.symbol);
    if (resCreate.retCode === 0 || resCreate.result.orderId !== '') {
        // console.log(resCreate.result.list);
        // convertAndSendBot(pos.side, order)
    }

}

export async function comparePosition(clientNumber: number, client: UnifiedMarginClient, curPos: Position[]): Promise<void> {
    // console.log('first', clientNumber, data.prePosition[clientNumber], firstCompare[clientNumber], firstGet[clientNumber]);
    // if (curPos.length === 0 && data.prePosition[clientNumber].length === 0) { return }
    const isBatch = true;

    if (firstGet[clientNumber]) {
        const myPos = await getMyPositions(client);
        // console.log(clientNumber, myPos.result.list, curPos);
        if (myPos.retCode !== 0) {
            console.log('Client number ' + clientNumber + 'lỗi')
        }
        else {
            const listPos = myPos.result.list;
            if (listPos.length !== 0) {
                // console.log('0', clientNumber);
                for (const pos of listPos) {
                    const posObj: Position = {
                        symbol: pos.symbol,
                        leverage: (parseInt(pos.leverage) * LEVERAGEBYBIT).toString(),
                        side: pos.side,
                        size: Math.floor(parseFloat(pos.size) * SIZEBYBIT).toString(),
                    }
                    // console.log(posObj.size);
                    data.prePosition[clientNumber].push(posObj);
                }
            }
            else {
                // console.log('1', clientNumber);
                const batchOpenPos: BatchOrders = { category: "linear", request: [] };
                curPos.forEach(pos => { batchOpenPos.request.push(convertToOrder(pos, isBatch)) });
                await openBatchOrders(client, batchOpenPos);
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
        if (closePos.length > 0) {
            // console.log('close', clientNumber, closePos);
            const batchClosePos: BatchOrders = { category: "linear", request: [] };
            closePos.forEach(pos => {
                if (pos.side === 'Buy') { pos.side = 'Sell'; }
                else {
                    pos.side = 'Buy';
                    pos.size = (parseInt(pos.size) * -1).toString();
                }
                batchClosePos.request.push(convertToOrder(pos, isBatch));
            });

            await openBatchOrders(client, batchClosePos);
        }
        if (openPos.length > 0) {
            // console.log('open', clientNumber, openPos);
            const batchOpenPos: BatchOrders = { category: "linear", request: [] };
            openPos.forEach(pos => { batchOpenPos.request.push(convertToOrder(pos, isBatch)) });
            await openBatchOrders(client, batchOpenPos);
        }
        if (samePos.length === curPos.length && samePos.length > 0 && curPos.length > 0) {
            // console.log('same', clientNumber, samePos);
            const batchChangePos: BatchOrders = compareSize(clientNumber, samePos, curPos);
            await openBatchOrders(client, batchChangePos);
        }
        data.prePosition[clientNumber] = curPos;
    }
}

function compareSize(clientNumber: number, samePos: Position[], curPos: Position[]) {
    const isBatch = true;
    const batchChangePos: BatchOrders = { category: "linear", request: [] };
    // console.log(samePos, curPos);
    for (const pos of curPos) {
        const matchingPos = samePos.filter((prePos) => pos.symbol === prePos.symbol)[0];
        const posSize = parseInt(pos.size);
        const matchPosSize = (parseInt(matchingPos.size) < 0) ? parseInt(matchingPos.size) * -1 : parseInt(matchingPos.size);
        // console.log(posSize, matchPosSize, matchingPos.side);
        if (posSize !== matchPosSize) {
            const newPos: Position = {
                symbol: pos.symbol,
                side: pos.side,
                leverage: pos.leverage,
                size: Math.abs(posSize - matchPosSize).toString(),
            }
            if (posSize < matchPosSize) {
                newPos.side = pos.side === 'Sell' ? 'Buy' : 'Sell';
                batchChangePos.request.push(convertToOrder(newPos, isBatch));
            } else if (posSize > matchPosSize) {
                newPos.side = pos.side === 'Sell' ? 'Sell' : 'Buy';
                batchChangePos.request.push(convertToOrder(newPos, isBatch));
            }
        }
    }
    firstCompare[clientNumber] = false;
    return batchChangePos;
}

function convertAndSendBot(action: string, order) {
    // for (const item of data) {
    let dataString = '';
    let icon = '';
    if (order.side === 'Buy') {
        icon = 'bull';
    } else {
        icon = 'bear';
    }
    dataString = "Action: " + action + "\nSymbol: " + order.symbol
        + "\nEntry: " + order.entryPrice + "\nSide: " + order.side + "\nLeverage: "
        + order.leverage + "\nSize: " + (parseInt(order.size) / SIZEBYBIT).toString();
    sendChatToBot(icon, dataString);
    // }   
    // break;
    // }
}