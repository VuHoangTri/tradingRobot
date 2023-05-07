import { AxiosProxyConfig } from "axios";
import { Account } from "./interface";
import { BybitAPI } from "./bybit";

export const INTERVAL = 800;
export const INTERVALACTION = 500;
export const SIZEBYBIT = 100000000;
export const LEVERAGEBYBIT = 100;
export const BINANCEURL = "https://www.binance.com/bapi/futures/v1/public/future/leaderboard/getOtherPosition";
// export const bybitTrader: string[] = [
//     "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=dzzffk%2B%2FqGvNboYCRvY38Q%3D%3D", // remove
//     // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=4pjjfgTlpIeWNdTARJUWsQ%3D%3D",
//     "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=saPU8WuUYBXXebYMgbRDRw%3D%3D",
//     // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=O5k95MOucrVPCGiLNW3Xaw%3D%3D",
//     "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=ezDycLoNFTp3Exq0IQhD1g%3D%3D"
// ];
// export const wagonList: string[] = [
//     // "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/5363",
//     "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/8303"  // 8303 // 5363 //6429 //9449
// ];
export const binanceTrader: { encryptedUid: string; tradeType: string }[] = [

]; // 227087068C057B808A83125C8E586BB8 "6408AAEEEBF0C76A3D5F0E39C64AAABA" "8FE17CCE0A3EA996ED7D8B538419C826" "EF6C3AABCBE82294A607E8C94633F082"  "8FE17CCE0A3EA996ED7D8B538419C826",
export const hotcoinTrader: string[] = [
    // "https://gw.hcglb.com/swap/v1/perpetual/follows/public/trader/currentLead?traderUid=7100137&platform=1&client=1&deviceId=&versionCode=3.0.1&lang=en_US"
];

// export const mexcTrader: string[] = [
//     'https://futures.mexc.com/copyFutures/api/v1/trader/orders?limit=10&orderListType=CONTRACT&uid=83129161'
// ]

export const accounts: Account[] = [
    {
        key: 'qQ94jsKBk7VJ7yvVsw',
        secret: '1NYC7ffuYcfv2fuW0tv7fc2QczJsQgLrU2Em',
        testnet: false,
        trader: "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/8453",//6824-10",//3841-240",//8303-15", //7952-8 //6824-10 //8453-50 // 9449-9
        gain: 50,
        platform: "Wagon",
        nodefetchProxy: [],
        botChat: "https://hooks.slack.com/services/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",
        index: 0
    },
    {
        key: 'QXvZHULCw7Lzjw5eqB',
        secret: '7EZOTNFfLO64tJhNiMt3AzSC64qv2H19ftH1',
        testnet: true,
        trader: "https://futures.mexc.com/copyFutures/api/v1/trader/orders?limit=10&orderListType=CONTRACT&uid=69843970", //08527742"
        gain: 6,
        platform: "Mexc",
        nodefetchProxy: [],
        botChat: "https://hooks.slack.com/services/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",
        index: 1
    },
    // {
    //   key: 'FUTDWUTKODGDKSWNLV',
    //   secret: 'OOJVCPQYRIMCWYGQNDBHFTIIZKRGEGZZJFGQ',
    //   testnet: true,
    // },         //"https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/7293",// "https://futures.mexc.com/copyFutures/api/v1/trader/orders?limit=10&orderListType=CONTRACT&uid=83129161", // 1500, //"Mexc"

    {
        key: 'CRYDWOZBKFVRRTDOHN',
        secret: 'MLVUFLNGJEBAOYOYXDJGMZPCDGNREQZTMMJS',
        testnet: true,
        trader:
        {
            "encryptedUid": "6408AAEEEBF0C76A3D5F0E39C64AAABA",
            "tradeType": "PERPETUAL"
        },
        gain: 26000,
        platform: "Binance",
        nodefetchProxy: [],
        botChat: "https://hooks.slack.com/services/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",
        index: 2
    }
];

export const proxyArr: string[] = [
    "185.199.229.156:7492:frawsmba:54hwnd9dtyv3",
    "188.74.210.207:6286:frawsmba:54hwnd9dtyv3",
    "188.74.183.10:8279:frawsmba:54hwnd9dtyv3",
    "188.74.210.21:6100:frawsmba:54hwnd9dtyv3",
    "45.155.68.129:8133:frawsmba:54hwnd9dtyv3",
    "45.94.47.66:8110:frawsmba:54hwnd9dtyv3"
]

export const nodeFetchProxyArr: string[] = [];

export const traderAPIs: BybitAPI[] = [];
