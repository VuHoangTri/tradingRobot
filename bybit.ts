import {
    RestClientV5,
    UnifiedMarginClient,
} from 'bybit-api';
import { Account, Leverage, Order, Position } from './interface';
import { INTERVAL, LEVERAGEBYBIT, axiosProxyArr } from './constant';
import { changeIndexProxy, consolidatePostion, convertBinanceFormat, convertByBitFormat, convertHotCoinFormat, convertMEXCFormat, convertOKXFormat, convertWagonFormat } from './action';
import { sendNoti } from './slack';
import _ from 'lodash';
import axios, { AxiosProxyConfig, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
// import { ATR } from '@debut/indicators';

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
    _isRun: boolean;
    constructor(acc: Account) {
        this._acc = acc;
        this._client = new UnifiedMarginClient(
            {
                key: this._acc.key,
                secret: this._acc.secret,
                testnet: false,
            },
        );
        // this.initial();
        this._trader = acc.trader;
        this._gain = acc.gain;
        this._clientV5 = new RestClientV5({
            key: acc.key,
            secret: acc.secret,
            testnet: false
        });
        this._platform = acc.platform;
        this._tryTimes = 1;
        this._isRun = true;
    }

    async initial() {
        // try {
        //     const position = await this.getMyPositions();

        //     if (position) {
        //         const myPos = position.result;
        //         this._coinList = myPos.list.map((c: any) => {
        //             return { symbol: c.symbol, amount: (Number(c.positionIM) * 2).toFixed(4).toString() }
        //         });
        //     }
        //     console.log(this._coinList);
        // }
        // catch (err) {
        //     sendNoti(`Initial Error Acc ${this._acc.index}`);
        //     await new Promise(r => setTimeout(r, 1000));
        //     await this.initial();
        // }
    }

    async getCopyList(isProxy: boolean) {
        try {
            let proxy: undefined | AxiosProxyConfig;
            changeIndexProxy();

            // const sT = new Date().getTime();
            if (isProxy)
                proxy = axiosProxyArr[0];
            if (this._platform === 'Binance') {
                this._curPos = await this.fetchCopy('post', proxy);
            }
            else {
                this._curPos = await this.fetchCopy('get', proxy);
            }
            // console.log("Bybit 63", new Date().getTime() - sT);
            return this._curPos;
        } catch (err) {
            sendNoti(`Get Copy List Error Acc: ${this._acc.index}`);
            return this._curPos;
        }
    }

    async fetchCopy(action: string, proxy?: AxiosProxyConfig) {
        try {
            const config: AxiosRequestConfig = {
                method: action,
                url: `${this._acc.url}${this._acc.trader}`,
                proxy
            };
            if (action === 'post') {
                config.url = this._acc.url;
                config.headers = { "Content-Type": "application/json" };
                config.data = JSON.stringify(this._acc.trader);
            }
            const copyPos = await axios(config)
            const response: any = copyPos.data;
            // console.log(98, this._acc.index, this._acc.platform, response);
            switch (this._acc.platform) {
                case 'Hotcoin':
                    if (response.msg === "success" && response.code === 200) {
                        this._tryTimes = 1;
                        return convertHotCoinFormat(this._exchangeInfo, response.data);
                    }
                    break;
                case 'Mexc':
                    if (response.success === true && response.code === 0) {
                        const markPrice: number[] = [];
                        for (const item of response.data.content) {
                            const mexcSym = item.symbol.split('_').join('');
                            const symbol = this._exchangeInfo.find(c => c.symbol.includes(mexcSym)).symbol;
                            item.symbol = symbol;
                            // console.log(mexcSym,symbol);
                            markPrice.push(Number(await this.getMarkPrice(symbol)));
                        }
                        this._tryTimes = 1;
                        return convertMEXCFormat(markPrice, response.data.content);
                    }
                    break;
                case 'Wagon':
                    if (response.success === true && response.code === "000000") {
                        this._tryTimes = 1;
                        return convertWagonFormat(response.data);
                    }
                    break;
                case 'Bybit':
                    // console.log(response);
                    if (response.retMsg === "success" && response.retCode === 0) {
                        const markPrice: number[] = [];
                        for (const item of response.result.data) {
                            markPrice.push(Number(await this.getMarkPrice(item.symbol)));
                        }
                        this._tryTimes = 1;
                        return convertByBitFormat(markPrice, response.result.data);
                    }
                    break;
                case 'OKX':
                    if (response.code === '0') {
                        this._tryTimes = 1;
                        const result = convertOKXFormat(response.data);
                        return consolidatePostion(result);
                    }
                    break;
                case 'Binance': {
                    if (response.success === true && response.code === "000000") {
                        const position = response.data.otherPositionRetList === null ? [] : response.data.otherPositionRetList;
                        for (const pos of position) {
                            pos.price = await this.getMarkPrice(pos.symbol);
                        }
                        // console.log(position);
                        const curPosition = convertBinanceFormat(position);
                        this._tryTimes = 1;
                        return curPosition;
                    }
                    break;
                }
                default: return undefined
            }
            return undefined;
        }
        catch (err) {
            await new Promise((r) => setTimeout(r, INTERVAL));
            this._tryTimes++;
            if (this._tryTimes <= 3) {
                // sendNoti(`Get Copy Error Acc ${this._acc.index}: ${err} ${axiosProxyArr[0].host} - Try again: ${this._tryTimes}`);
                await this.getCopyList(true);
            }
            else if (this._tryTimes <= 4) {
                sendNoti(`Get Copy Error Acc ${this._acc.index}: ${err} - Try again with non-proxy`);
                await this.getCopyList(false);
            }
            return undefined;
        }
    }

    async adjustLeverage() {
        try {
            // let count = 0;
            const symbols = this._exchangeInfo.map(c => c.symbol);
            for await (const symbol of symbols) {
                // const leverageFilter = this._exchangeInfo.find(c => c.symbol === pos.symbol).leverageFilter;
                // const maxLever = Number(leverageFilter.maxLeverage)
                // const lever = (Number(pos.leverage) / LEVERAGEBYBIT);
                // const selectedLever = (lever >= maxLever)
                //     ? maxLever
                //     : lever;
                const leverage: Leverage = {
                    category: 'linear',
                    symbol: symbol,
                    sellLeverage: '12',
                    buyLeverage: '12'
                };
                const res = await this.setLeverage(leverage);
                console.log(res);
                await new Promise((r) => setTimeout(r, 200))
                // console.log(res);
                // if (count === 3) {
                //     await new Promise((r) => setTimeout(r, 200));
                //     count = 0;
                // } else {
                //     count++;
                // }
            }
        } catch (err: any) {
            sendNoti(`Adjust leverage Err Acc ${this._acc.index}: ${err}`);
        }
    }

    async getAccountByBit() {
        try {
            const info = await this._client.getPrivate('/unified/v3/private/account/info')
            console.log(`Check account ${this._acc.index} Done`);
            return info;
        } catch (err) {
            sendNoti(`getAccountInfo error Acc ${this._acc.index}: ${err}`);
            return undefined;
        }
    }

    async getAPIKeyInfor() {
        try {
            const info = await this._clientV5.getQueryApiKey();
            return info;
        } catch (err) {
            sendNoti(`getAPIKeyInfor error Acc ${this._acc.index}: ${err}`);
            return undefined;
        }
    }

    async getMarkPrice(symbol: string): Promise<string | undefined> {
        try {
            const res = await this._client.getSymbolTicker("linear", symbol)
            const sym: any = res.result.list[0];
            return sym.markPrice;
        } catch (err) {
            sendNoti(`Get Mark Price error Acc ${this._acc.index}: ${err}`);
            await new Promise(r => setTimeout(r, 1000));
            await this.getMarkPrice(symbol);
            return undefined;
        }
    }

    async getWalletBalance() {
        try {
            const res = await this._client.getBalances();
            const result = res.result;
            if (result)
                return { init: result.totalWalletBalance, unPnL: result.totalPerpUPL };
            return undefined
        } catch (err) {
            sendNoti(`Get wallet Balance error Acc ${this._acc.index}: ${err}`);
            return undefined;
        };
    }

    async getMyPositions() {
        try {
            const res = await this._client.getPositions({ category: 'linear' });
            return res;
        } catch (err) {
            sendNoti(`Get Position error Acc ${this._acc.index}: ${err}`);
            return undefined;
        }
    }

    async createOrder(order: Order) {
        try {
            const result = await this._clientV5.submitOrder(order);
            return result;
        } catch (err) {
            sendNoti(`Create Order Error Acc ${this._acc.index}: ${err}`);
            return undefined;
        };
    }

    async setLeverage(leverage: Leverage) {
        try {
            const result = await this._clientV5.setLeverage(leverage);
            return result;
        } catch (err) {
            sendNoti(`Set Leverage error Acc ${this._acc.index}: ${err}`);
            return undefined;
        };
    }

    async cancelOrder(symbol: string) {
        try {
            const result = await this._clientV5.cancelOrder({ category: "linear", symbol });
            return result.retMsg;
        } catch (err) {
            sendNoti(`Cancel error Acc ${this._acc.index}: ${err}`);
            return undefined;
        };
    }

    async getExchangeInfo() {
        try {
            const res = await this._client.getInstrumentInfo({ category: 'linear' });
            return res.result.list;
        } catch (err) {
            sendNoti(`Get Exchange Info error Acc ${this._acc.index}: ${err}`);
            return undefined;
        };
    }
    async transferMoney(isGet: boolean, amount: string) {
        try {
            const mainAcc = new RestClientV5({
                key: 'Q85XCeNGI61cKZ0Dwi',
                secret: '2Ncni8kCkjEaaAdB5m4Bn5zhyXrmvb5hQdrW',
                testnet: false
            });
            let res;
            if (isGet) {
                res = await mainAcc.createUniversalTransfer({
                    amount: (Number(amount) / 10).toFixed(4).toString(), coin: 'USDT', fromAccountType: 'UNIFIED', toAccountType: 'UNIFIED',
                    fromMemberId: 66841725, toMemberId: this._acc.uid, transferId: uuidv4()
                });
            } else {
                res = await mainAcc.createUniversalTransfer({
                    amount: (Number(amount) / 10).toFixed(4).toString(), coin: 'USDT', fromAccountType: 'UNIFIED', toAccountType: 'UNIFIED',
                    fromMemberId: this._acc.uid, toMemberId: 66841725, transferId: uuidv4()
                });
            }
            await new Promise((r) => setTimeout(r, 200));
            return res;
        } catch (err) {
            sendNoti(`Transfer error Acc ${this._acc.index}: ${err}, ${isGet}`);
        };
    }

    // async getLastATR(symbol: string) {
    //     try {
    //         const res = await this._clientV5.getKline({
    //             category: "linear",
    //             interval: "240",
    //             symbol,
    //             limit: 500,
    //             start: new Date().getTime() - 240 * 70 * 60 * 1000
    //         });
    //         const list = res.result.list.sort((a, b) => Number(a[0]) - Number(b[0]));
    //         const decimal = Math.max(...[list[0][2].split('.')[1]?.length ?? 0, list[0][3].split('.')[1]?.length ?? 0, list[0][4].split('.')[1]?.length ?? 0]);
    //         const atr = new ATR(14, "EMA");
    //         let lastATR: number = 0;
    //         for (const item of list) {
    //             const val = atr.nextValue(Number(item[2]), Number(item[3]), Number(item[4]));
    //             lastATR = val;
    //         }
    //         const threshold = lastATR.toFixed(decimal);            
    //         return threshold;
    //     } catch (err) {
    //         sendNoti(`get last ATR err acc ${this._acc.index}: ${err}, ${symbol}`);
    //         this.getLastATR(symbol);
    //     }
    // }

    async getClosedPNL(pnlParam: { symbol?: string, time?: number, limit?: number, cursor?: string }) {
        try {
            let sTime = 0;
            if (pnlParam.time !== undefined)
                sTime = pnlParam.time;
            else
                sTime = new Date().getTime() - 2592117632;
            const res = await this._clientV5.getClosedPnL({
                category: "linear", symbol: pnlParam.symbol, limit: pnlParam.limit
                , startTime: sTime, cursor: pnlParam.cursor
            });
            return res.result;
        } catch (err) {
            sendNoti(`Get Closed PNL error Acc ${this._acc.index}: ${err}`);
            return undefined;
        };
    }

    async getTradeFee(pnlParam: { limit?: number, cursor?: string, time?: number }) {
        try {
            let sTime = 0;
            if (pnlParam.time !== undefined) sTime = pnlParam.time;
            else sTime = new Date().getTime() - 2592117632;
            const res = await this._clientV5.getTransactionLog({
                type: 'TRADE', currency: 'USDT', accountType: 'UNIFIED',
                category: "linear", limit: pnlParam.limit
                , startTime: sTime, cursor: pnlParam.cursor
            });
            return res.result;
        } catch (err) {
            sendNoti(`Get Trade Fee error Acc ${this._acc.index}: ${err}`);
            return { nextPageCursor: '', list: [] }
        };
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


