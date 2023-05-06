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
    leverage: string;
}

export interface Order {
    symbol: string;
    category?: 'linear' | 'option';
    price?: string;
    side: 'Buy' | 'Sell';
    orderType: 'Market' | 'Limit';
    qty: string;
    timeInForce: 'GoodTillCancel' | 'ImmediateOrCancel' | 'FillOrKill' | 'PostOnly';
    leverage?: string;
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
    testnet: boolean;
    trader: string | BinanceTrader;
    gain: number;
    platform: string;
    axiosProxy?: AxiosProxyConfig[];
    botChat: string; 
    index: number;
}

export interface BinanceTrader {
    encryptedUid: string;
    tradeType: string;
}