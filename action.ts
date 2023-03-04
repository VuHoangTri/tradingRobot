import { createOrder, getMarkPrice, getMyPositions, setLeverage } from "./bybit";
import { LEVERAGEBYBIT, SIZEBYBIT } from "./constant";
import { ApiObject, BatchOrders, Leverage, Order, Position } from "./interface";
import { data } from "./main";
import { sendChatToBot } from "./slack";
import _ from 'lodash';

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

export function convertToOrder(pos: Position, batch: boolean) {
    const res: Order = {
        symbol: pos.symbol,
        orderType: 'Market',
        qty: (parseInt(pos.size) / SIZEBYBIT).toString(),
        side: pos.side,
        timeInForce: 'GoodTillCancel',
    };
    if (!batch) {
        res.category = 'linear';
    }

    return res;
}

export async function openOrder(pos: Position) {
    const newOrder = convertToOrder(pos, false);
    const lever = (parseInt(pos.leverage) / LEVERAGEBYBIT).toString();
    const leverage: Leverage = {
        category: 'linear',
        symbol: pos.symbol,
        sellLeverage: lever,
        buyLeverage: lever
    };
    const resLever = await setLeverage(leverage);
    if (resLever.retCode === 0 || resLever.retMsg === 'leverage not modified') {
        const resCreate = await createOrder(newOrder);
        const data = _.cloneDeep(pos);
        data.entryPrice = await getMarkPrice(pos.symbol);
        // console.log(resCreate);
        if (resCreate.retCode === 0 || resCreate.result.orderId !== '')
            convertAndSendBot(pos.side, data)
    }
}

export async function comparePosition(curPos: Position[]): Promise<void> {
    if (data.prePosition.length === 0) {
        const myPos = await getMyPositions();
        for (const pos of myPos) {
            const posObj: Position = {
                symbol: pos.symbol,
                leverage: (parseInt(pos.leverage) * LEVERAGEBYBIT).toString(),
                side: pos.side,
                size: Math.floor(parseFloat(pos.size) * SIZEBYBIT).toString(),
            }
            data.prePosition.push(posObj);
            // await openOrder(posObj);
        }
    }
    else {
        for (const pos of curPos) {
            const matchingPos = data.prePosition.filter((prePos) => pos.symbol === prePos.symbol && pos.side === prePos.side);
            if (matchingPos.length === 0) {
                openOrder(matchingPos[0]);
            } else {
                if (parseInt(pos.size) !== parseInt(matchingPos[0].size)) {
                    const newPos: Position = {
                        symbol: pos.symbol,
                        side: pos.side,
                        leverage: pos.leverage,
                        size: Math.abs(parseInt(pos.size) - parseInt(matchingPos[0].size)).toString(),
                    }
                    // console.log(newPos)
                    if (parseInt(pos.size) < parseInt(matchingPos[0].size)) {
                        newPos.side = 'Sell';
                        await openOrder(newPos);
                    } else if (parseInt(pos.size) > parseInt(matchingPos[0].size)) {
                        await openOrder(newPos);
                    }
                }
            }
        }
        data.prePosition = curPos;
    }
}

function convertAndSendBot(action: string, data) {
    // for (const item of data) {
    let dataString = '';
    let icon = '';
    if (data.side === 'Buy') {
        icon = 'bull';
    } else {
        icon = 'bear';
    }
    dataString = "Action: " + action + "\nSymbol: " + data.symbol
        + "\nEntry: " + data.entryPrice + "\nSide: " + data.side + "\nLeverage: "
        + data.leverage + "\nSize: " + (parseInt(data.size) / SIZEBYBIT).toString();
    // + "\nMarkPrice: " + data.markPrice
    // if (item.symbol === 'SOLUSDT') {
    // console.log(dataString);
    sendChatToBot(icon, dataString);
    // }   
    // break;
    // }
}