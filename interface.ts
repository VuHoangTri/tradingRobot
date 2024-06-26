import { AxiosProxyConfig } from "axios";

export interface ApiObject {
    symbol: string;
    entryPrice: string;
    sizeX: string;
    createdAtE3: string;
    side: 'Buy' | 'Sell';
    leverageE2: string;
    isIsolated: boolean;
    transactTimeE3: string;
    stopLossPrice: string;
    takeProfitPrice: string;
    takeProfitOrderId: string;
    stopLossOrderId: string;
    orderCostE8: string;
    reCalcEntryPrice: string;
    positionEntryPrice: string;
    buyDate: string;
    sellDate: string;
    createDate: string;
    markPrice?: string;
}

export interface Position {
    symbol: string;
    side?: 'Buy' | 'Sell';
    size: string;
    pnl?: number;
    entry?: string;
}

export interface Order {
    symbol: string;
    category: 'linear' | 'option';
    price?: string;
    side: 'Buy' | 'Sell';
    orderType: 'Market' | 'Limit';
    qty: string;
    timeInForce: 'GTC' | 'IOC' | 'FOK' | 'PostOnly';//'GoodTillCancel' | 'ImmediateOrCancel' | 'FillOrKill' | 'PostOnly';
    takeProfit?: string;
    stopLoss?: string;
}

export interface BatchOrders {
    category: 'linear' | 'option';
    request: Order[]
}

export interface Data {
    // close: ApiObject[];
    // open: ApiObject[];
    botEnabled: boolean;
    symbols: any[];
    prePosition: Position[][]
}

export interface Leverage {
    category: "linear";
    symbol: string;
    buyLeverage: string;
    sellLeverage: string;
}

export interface Account {
    key: string;
    secret: string;
    trader: string | BinanceTrader;
    gain: number;
    platform: string;
    index: number;
    tP: boolean;
    limitPercent: boolean;
    url: string;
    uid: number;
}

export interface BinanceTrader {
    encryptedUid: string;
    tradeType: string;
}