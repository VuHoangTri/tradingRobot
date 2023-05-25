import {
    RestClientV5,
    UnifiedMarginClient,
} from 'bybit-api';
import { Account, BatchOrders, BinanceTrader, Leverage, Order, Position } from './interface';
import { BINANCEURL, LEVERAGEBYBIT, axiosProxyArr, nodeFetchProxyArr, traderAPIs } from './constant';
import { changeIndexProxy, convertBinanceFormat, convertHotCoinFormat, convertMEXCFormat, convertWagonFormat } from './action';
import { sendNoti } from './slack';
import _ from 'lodash';
// import { RequestInit } from "node-fetch";
// import fetch from "node-fetch";
import { HttpsProxyAgent } from 'hpagent';
import axios, { AxiosProxyConfig } from 'axios';
import bodyParser from 'body-parser';

export class BybitAPI {
    _client: UnifiedMarginClient = new UnifiedMarginClient;
    _trader: any;
    _gain: number;
    _clientV5: RestClientV5 = new RestClientV5;
    _platform: string;
    _curPos: Position[] | undefined = undefined;
    _prePos: Position[] = [];
    _firstGet: boolean = true;
    _exchangeInfo: any = [];
    _acc: Account;
    _tryTimes: number;
    constructor(acc: Account) {
        this._acc = acc;
        this._client = new UnifiedMarginClient(
            {
                key: this._acc.key,
                secret: this._acc.secret,
                testnet: this._acc.testnet,
            },
        );
        // this.initial();
        this._trader = acc.trader;
        this._gain = acc.gain;
        this._clientV5 = new RestClientV5({
            key: acc.key,
            secret: acc.secret,
            testnet: acc.testnet
        });
        this._platform = acc.platform;
        this._tryTimes = 1;
    }

    initial() {
        // console.log(randomNumber);
        this._client = new UnifiedMarginClient(
            {
                key: this._acc.key,
                secret: this._acc.secret,
                testnet: this._acc.testnet,
            },
            // { proxy: this._acc.axiosProxy ? this._acc.axiosProxy[randomNumber] : undefined }
        );
    }
    async getCopyList(isProxy: boolean) {
        try {
            let proxy: undefined | AxiosProxyConfig;
            changeIndexProxy();

            // const sT = new Date().getTime();
            if (isProxy)
                proxy = axiosProxyArr[0];
            // proxy = { host: 'p.webshare.io', port: 80, auth: { password: '54hwnd9dtyv3', username: 'frawsmba-rotate' }, protocol: 'http' };
            // console.log(proxy);
            if (this._platform === 'Binance') {
                this._curPos = await this.getBinanceCopyList(proxy);
            }
            else {
                this._curPos = await this.getOtherCopyList(proxy);
            }
            // console.log("Bybit 63", new Date().getTime() - sT);
            return this._curPos;
        } catch (err) {
            sendNoti(`Get Copy List Error Acc: ${this._acc.index}`);
            return this._curPos;
        }
    }

    async getBinanceCopyList(proxy?: AxiosProxyConfig) {
        try {
            // const requestOptions: RequestInit = {
            //     method: 'POST',
            //     headers: {
            //         "Content-Type": "application/json",
            //     },
            //     redirect: "follow",
            //     body: JSON.stringify(this._trader),
            //     agent: proxy,
            // };
            const copyPos = await axios({
                method: 'post',
                url: BINANCEURL,
                proxy: proxy,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify(this._trader)
            }).then(res => { return res });
            const response: any = copyPos.data;
            if (response.success === true && response.code === "000000") {
                const curPosition = convertBinanceFormat(this._gain, response.data.otherPositionRetList);
                this._tryTimes = 1;
                return curPosition;
            }
            return undefined;
        }
        catch (err) {
            await new Promise((r) => setTimeout(r, 2000));
            this._tryTimes++;
            if (this._tryTimes <= 3) {
                sendNoti(`Get Binance Error Acc ${this._acc.index}: ${err} ${axiosProxyArr[0]}- Try again: ${this._tryTimes}`);
                await this.getCopyList(true);
            }
            else {
                sendNoti(`Get Binance Error Acc ${this._acc.index}: ${err} - Try again with non-proxy`);
                await this.getCopyList(false);
            }
            return undefined;
        }
    }

    async getOtherCopyList(proxy?: AxiosProxyConfig) {
        try {
            const copyPos = await axios.get(this._trader, { proxy }).then(res => { return res });
            // console.log(copyPos);
            // const copyPos = await fetch(this._trader
            //     , { agent: proxyAgent }
            // );
            const response: any = copyPos.data;
            if (this._platform === 'Hotcoin') {
                if (response.msg === "success" && response.code === 200) {
                    this._tryTimes = 1;
                    return convertHotCoinFormat(this._exchangeInfo, this._gain, response.data);
                }
            }
            else if (this._platform === 'Mexc') {
                await new Promise((r) => setTimeout(r, 500));
                if (response.success === true && response.code === 0) {
                    const markPrice: number[] = [];
                    for (const item of response.data.content) {
                        markPrice.push(Number(await this.getMarkPrice(item.symbol.split('_').join(''))))
                    }
                    this._tryTimes = 1;
                    return convertMEXCFormat(markPrice, this._gain, response.data.content);
                }
            } else {
                if (response.success === true && response.code === "000000") {
                    this._tryTimes = 1;
                    return convertWagonFormat(this._gain, response.data);
                }
            }
            return undefined;
        }
        catch (err) {
            await new Promise((r) => setTimeout(r, 2000));
            this._tryTimes++;
            if (this._tryTimes <= 3) {
                sendNoti(`Get Other Error Acc ${this._acc.index}: ${err} ${axiosProxyArr[0].host} - Try again: ${this._tryTimes}`);
                await this.getCopyList(true);
            }
            else {
                sendNoti(`Get Other Error Acc ${this._acc.index}: ${err} - Try again with non-proxy`);
                await this.getCopyList(false);
            }
            return undefined;
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
                // console.log(res);
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

    // async openBatchOrders(batchOrders: BatchOrders, action: string) {
    //     try {
    //         if (batchOrders.request.length > 0) {
    //             for (let i = 0; i < batchOrders.request.length; i += 9) {
    //                 const chunkBatchOrders: BatchOrders = _.cloneDeep(batchOrders);
    //                 chunkBatchOrders.request = chunkBatchOrders.request.slice(i, i + 9);
    //                 const resCreate: any = await this.submitBatchOrders(chunkBatchOrders);
    //                 // console.log(resCreate, resCreate.result.list, resCreate.retExtInfo.list);
    //                 if (resCreate) {
    //                     if (resCreate.retCode === 0) {
    //                         for (let i = 0; i < resCreate.result.list.length; i++) {
    //                             if (resCreate.result.list[i].orderId !== '') {
    //                                 const order = batchOrders.request[i];
    //                                 order.price = await this.getMarkPrice(order.symbol);
    //                                 convertAndSendBot(order, this._acc.botChat, action);
    //                             }
    //                         }
    //                     }
    //                     else sendNoti(`Submit Batch Err At Open Acc  ${this._acc.index}: ${resCreate.retMsg}`);
    //                 }
    //             }
    //         }
    //     } catch (err: any) {
    //         sendNoti(`Open batch order error Acc ${this._acc.index}: ${err}`);
    //     }
    // }

    async getAccountByBit() {
        const info = await this._client.getPrivate('/unified/v3/private/account/info')
            .then(result => {
                console.log(`Check account ${this._acc.index} Done`);
                return result;
            })
            .catch(err => {
                sendNoti(`getAccountInfo error Acc ${this._acc.index}: ${err}`);
                return undefined;
            });
        return info;
    }

    async getAPIKeyInfor() {
        const info = await this._clientV5.getQueryApiKey()
            .then(result => {
                return result;
            })
            .catch(err => {
                sendNoti(`getAPIKeyInfor error Acc ${this._acc.index}: ${err}`);
                return undefined;
            });
        return info;
    }

    async getMarkPrice(symbol: string): Promise<string> {
        const res = await this._client.getSymbolTicker("linear", symbol)
            .then(res => { return res.result.list[0] })
            .catch(err => {
                sendNoti(`Get Mark Price error Acc ${this._acc.index}: ${err}`);
                return undefined;
            });
        const markPrice: any = res;
        return markPrice.markPrice;

    }

    async getWalletBalance() {
        const res = await this._client.getBalances()
            .then(res => { return res.result })
            .catch(err => {
                sendNoti(`Get wallet Balance error Acc ${this._acc.index}: ${err}`);
                return undefined;
            });
        return { init: res.totalWalletBalance, unPnL: res.totalPerpUPL };
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


    async createOrder(order: Order) {
        const result = await this._clientV5.submitOrder(order)
            // client.postPrivate('/unified/v3/private/order/create', order)
            .then(res => { return res })
            .catch(err => {
                sendNoti(`Create Order Error Acc ${this._acc.index}: ${err}`);
                return undefined;
            });
        // const result = await client.postPrivate('/unified/v3/private/order/create', newOrder);
        return result;

    }

    // async submitBatchOrders(batchOrders: BatchOrders) {
    //     try {
    //         const result = this._client.batchSubmitOrders('linear', batchOrders.request)
    //             // const result = await client.postPrivate('/unified/v3/private/order/create-batch', batchOrders)
    //             .then(res => { return res })
    //             .catch(err => {
    //                 sendNoti(`Submit Batch Order error Acc ${this._acc.index}: ${err}`);
    //                 return undefined;
    //             });
    //         return result;
    //     } catch (error) {
    //         console.error(error);
    //     }
    // }

    async setLeverage(leverage: Leverage) {
        // const { category, symbol, buyLeverage, sellLeverage } = leverage
        const result = await this._clientV5
            .setLeverage(leverage)
            // .setLeverage(category, symbol, Number(buyLeverage), Number(sellLeverage))

            // .postPrivate('unified/v3/private/position/set-leverage', leverage)
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

    async getTradeFee(pnlParam: { limit?: number, cursor?: string, time?: number }) {
        try {
            let sTime = 0;
            if (pnlParam.time !== undefined) {
                sTime = pnlParam.time;
            } else
                sTime = new Date().getTime() - 2592117632;
            const res = await this._clientV5.getTransactionLog({
                type: 'TRADE', currency: 'USDT', accountType: 'UNIFIED',
                category: "linear", limit: pnlParam.limit
                , startTime: sTime, cursor: pnlParam.cursor
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
        try {
            let res = await this.getClosedPNL({ cursor: args.nextPageCursor, time: args.time });
            let sum = 0;
            while (res !== undefined && typeof res !== 'string' && res.nextPageCursor !== '') {
                sum = sum + res.list.reduce((acc, cur) => acc + Number(cur.closedPnl), 0);
                res = await this.getClosedPNL({ cursor: res.nextPageCursor, time: args.time })
            }
            return sum;
        }
        catch (err) {
            sendNoti(`Get Total PnL Error Acc: ${this._acc.index}`);
            return 0;
        }
    }

    async getTotalTradeFee(args: { nextPageCursor?: string, time?: number }) {
        try {
            let res = await this.getTradeFee({ cursor: args.nextPageCursor, time: args.time });
            let sum = 0;
            let length = 0;
            while (res !== undefined && typeof res !== 'string' && Boolean(res.nextPageCursor)) {
                length = length + res.list.length;
                sum = sum + res.list.reduce((acc, cur) => acc + Number(cur.fee), 0);
                res = await this.getTradeFee({ cursor: res.nextPageCursor, time: args.time })
            }
            return sum;
        }
        catch (err) {
            sendNoti(`Get Total Trade Fee Error Acc: ${this._acc.index}`);
            return 0;
        }
    }
}


