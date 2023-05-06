import {
    RestClientV5,
    UnifiedMarginClient,
} from 'bybit-api';
import { Account, BatchOrders, BinanceTrader, Leverage, Position } from './interface';
import { BINANCEURL, LEVERAGEBYBIT } from './constant';
import { convertAndSendBot, convertBinanceFormat, convertHotCoinFormat, convertMEXCFormat, convertWagonFormat } from './action';
import { sendNoti } from './slack';
import _ from 'lodash';
import { RequestInit } from "node-fetch";
import fetch from "node-fetch";

export class BybitAPI {
    _client: UnifiedMarginClient = new UnifiedMarginClient;
    _copyTrader: any;
    _gain: number;
    _clientV5: RestClientV5 = new RestClientV5;
    _platform: string;
    _curPos: Position[] = [];
    _prePos: Position[] = [];
    _firstGet: boolean = true;
    _exchangeInfo: any = [];
    _acc: Account;
    constructor(acc: Account) {
        this._acc = acc;
        // this._client = new UnifiedMarginClient(
        //     {
        //         key: acc.key,
        //         secret: acc.secret,
        //         testnet: acc.testnet,
        //     },
        // );
        this.initial();
        this._copyTrader = acc.trader;
        this._gain = acc.gain;
        this._clientV5 = new RestClientV5({
            key: acc.key,
            secret: acc.secret,
            testnet: acc.testnet
        });
        this._platform = acc.platform;
    }

    initial() {
        const randomNumber = Math.floor(Math.random() * (4 - 0) + 0);
        // console.log(randomNumber);
        this._client = new UnifiedMarginClient(
            {
                key: this._acc.key,
                secret: this._acc.secret,
                testnet: this._acc.testnet,
            },
            { proxy: this._acc.axiosProxy ? this._acc.axiosProxy[randomNumber] : undefined }
        );
    }
    async getCopyList() {
        if (this._platform === 'Binance') {
            this._curPos = await this.getBinanceCopyList();
        }
        else {
            this._curPos = await this.getOtherCopyList();
        }
        return this._curPos;
    }

    async getBinanceCopyList() {
        try {
            const requestOptions: RequestInit = {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                },
                redirect: "follow",
                body: JSON.stringify(this._copyTrader),
            };
            const copyPos = await fetch(BINANCEURL, requestOptions);
            const response: any = await copyPos.json();
            if (response.success === true && response.code === "000000") {
                const curPosition = convertBinanceFormat(this._gain, response.data.otherPositionRetList);
                return curPosition;
            }
            return [];
        }
        catch (err) {
            sendNoti(`Get Binance Error Acc ${this._acc.index}: ${err}`);
            return [];
        }
    }

    async getOtherCopyList() {
        try {
            const copyPos = await fetch(this._copyTrader);
            const response: any = await copyPos.json();
            if (this._platform === 'Hotcoin') {
                if (response.msg === "success" && response.code === 200) {
                    return convertHotCoinFormat(this._exchangeInfo, this._gain, response.data);
                }
            }
            else if (this._platform === 'Mexc') {
                if (response.success === true && response.code === 0) {
                    return convertMEXCFormat(this._gain, response.data.content);
                }
            } else {
                if (response.success === true && response.code === "000000") {
                    return convertWagonFormat(this._gain, response.data);
                }
            }
            return [];
        }
        catch (err) {
            sendNoti(`Get Other Error Acc ${this._acc.index}: ${err}`);
            return [];
        }
    }

    async adjustLeverage(positions: Position[]) {
        try {
            let count = 0;
            for await (const pos of positions) {
                const leverageFilter = this._exchangeInfo.find(c => c.symbol === pos.symbol).leverageFilter;
                const maxLever = Number(leverageFilter.maxLeverage)
                const lever = (Number(pos.leverage) / LEVERAGEBYBIT);
                const selectedLever = (lever >= maxLever)
                    ? maxLever
                    : lever;
                const leverage: Leverage = {
                    category: 'linear',
                    symbol: pos.symbol,
                    sellLeverage: selectedLever.toString(),
                    buyLeverage: selectedLever.toString()
                };
                const res = await this.setLeverage(leverage);
                if (count === 3) {
                    await new Promise((r) => setTimeout(r, 2000));
                    count = 0;
                } else {
                    count++;
                }
            }
        } catch (err: any) {
            sendNoti(`Adjust leverage Err Acc ${this._acc.index}: ${err}`);
        }
    }

    async openBatchOrders(batchOrders: BatchOrders, pnl: boolean) {
        try {
            if (batchOrders.request.length > 0) {
                for (let i = 0; i < batchOrders.request.length; i += 9) {
                    const chunkBatchOrders: BatchOrders = _.cloneDeep(batchOrders);
                    chunkBatchOrders.request = chunkBatchOrders.request.slice(i, i + 9);
                    const resCreate = await this.submitBatchOrders(chunkBatchOrders);
                    if (resCreate) {
                        if (resCreate.retCode === 0) {
                            for (let i = 0; i < resCreate.result.list.length; i++) {
                                if (resCreate.result.list[i].orderId !== '') {
                                    const order = batchOrders.request[i];
                                    let actualPNL = "";
                                    if (pnl === true) {
                                        actualPNL = "Có PNL";
                                    } else actualPNL = "Increase vol";
                                    order.price = await this.getMarkPrice(order.symbol);
                                    convertAndSendBot(order.side, order, this._acc.botChat, actualPNL);
                                }
                            }
                        }
                        else sendNoti(`Submit Batch Err At Open: ${resCreate.retMsg}`);
                    }
                }
            }
        } catch (err: any) {
            sendNoti(`Open batch order error Acc ${this._acc.index}: ${err}`);
        }
    }

    async getAccountByBit() {
        const info = await this._client.getPrivate('/unified/v3/private/account/info')
            .then(result => {
                console.log('Check account Done');
                return result;
            })
            .catch(err => {
                sendNoti(`getAccountInfo error Acc ${this._acc.index}: ${err}`);
                return undefined;
            });
        return info;
    }

    async getMarkPrice(symbol: string): Promise<string> {
        try {
            const res = await this._client.getSymbolTicker("linear", symbol)
                .then(res => { return res.result.list[0] })
                .catch(err => {
                    sendNoti(`Get Mark Price error Acc ${this._acc.index}: ${err}`);
                    return undefined;
                });
            const markPrice: any = res;
            return markPrice.markPrice;
        }
        catch (err) {
            return `Error ${err}`
        }
    }

    async getWalletBalance() {
        const res = this._client.getBalances()
            .then(res => { return res })
            .catch(err => {
                sendNoti(`Get wallet Balance error Acc ${this._acc.index}: ${err}`);
                return undefined;
            });
        return res
    }

    async getMyPositions() {
        const res = await this._client
            // .getPrivate('/unified/v3/private/position/list?category=linear')
            .getPositions({ category: 'linear' })
            .then(res => {
                // console.log(res);
                return res;
            })
            .catch(err => {
                sendNoti(`Get Position error Acc ${this._acc.index}: ${err}`);
                return undefined;
            });
        return res;
    }

    async submitBatchOrders(batchOrders: BatchOrders) {
        try {
            const result = this._client.batchSubmitOrders('linear', batchOrders.request)
                // const result = await client.postPrivate('/unified/v3/private/order/create-batch', batchOrders)
                .then(res => { return res })
                .catch(err => {
                    sendNoti(`Submit Batch Order error Acc ${this._acc.index}: ${err}`);
                    return undefined;
                });
            return result;
        } catch (error) {
            console.error(error);
        }
    }

    async setLeverage(leverage: Leverage) {
        // const { category, symbol, buyLeverage, sellLeverage } = leverage
        const result = await this._client
            // .setLeverage(category, symbol, Number(buyLeverage), Number(sellLeverage))
            .postPrivate('unified/v3/private/position/set-leverage', leverage)
            .then(res => { return res })
            .catch(err => {
                sendNoti(`Set Leverage error Acc ${this._acc.index}: ${err}`);
                return undefined;
            });
        return result;

    }

    async getExchangeInfo() {
        try {
            const res = await this._client.getInstrumentInfo({ category: 'linear' })
                .then(res => { return res.result.list })
                .catch(err => {
                    sendNoti(`Get Exchange Info error Acc ${this._acc.index}: ${err}`);
                    return undefined;
                });
            return res;
        }
        catch (error) {
            return `exchange ${error}`
        }
    }

    async getClosedPNL(pnlParam: { symbol?: string, time?: number, limit?: number, cursor?: string }) {
        try {
            let sTime = 0;
            if (pnlParam.time !== undefined) {
                sTime = pnlParam.time;
            } else
                sTime = new Date().getTime() - 2592117632;
            const res = await this._clientV5.getClosedPnL({
                category: "linear", symbol: pnlParam.symbol, limit: pnlParam.limit
                , startTime: sTime, cursor: pnlParam.cursor
            })
                .then(res => { return res.result })
                .catch(err => {
                    sendNoti(`Get Closed PNL error Acc ${this._acc.index}: ${err}`);
                    return undefined;
                });
            return res;
        }
        catch (error) {
            return `getClosePnL ${error}`
        }
    }

    async getTradeFee(pnlParam: { limit?: number, cursor?: string }) {
        try {
            const time = new Date().getTime() - 2592117632;
            const res = await this._clientV5.getTransactionLog({
                type: 'TRADE', currency: 'USDT', accountType: 'UNIFIED',
                category: "linear", limit: pnlParam.limit
                , startTime: time, cursor: pnlParam.cursor
            })
                .then(res => { return res.result })
                .catch(err => {
                    sendNoti(`Get Trade Fee error Acc ${this._acc.index}: ${err}`);
                    return undefined;
                });
            return res;
        }
        catch (error) {
            return { nextPageCursor: '', list: [] }
        }
    }
    async getTotalPnL(args: { nextPageCursor?: string, time?: number }) {
        let res = await this.getClosedPNL({ cursor: args.nextPageCursor, time: args.time });
        let sum = 0;
        while (res !== undefined && typeof res !== 'string' && res.nextPageCursor !== '') {
            sum = sum + res.list.reduce((acc, cur) => acc + Number(cur.closedPnl), 0);
            res = await this.getClosedPNL({ cursor: res.nextPageCursor })
        }
        return sum;
    }
}

// export async function createOrder(client: UnifiedMarginClient, order: Order) {
//     try {
//         const result = await client.postPrivate('/unified/v3/private/order/create', order)
//             .then(res => { return res });
//         // const result = await client.postPrivate('/unified/v3/private/order/create', newOrder);
//         return result;
//     } catch (error) {
//         console.error(error);
//     }
// }

