import { Account } from "./interface";
import { BybitAPI } from "./bybit";
import { Logtail } from "@logtail/node";

export const INTERVAL = 10000;
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
    // {
    //     key: 'qQ94jsKBk7VJ7yvVsw',
    //     secret: '1NYC7ffuYcfv2fuW0tv7fc2QczJsQgLrU2Em',
    //     testnet: false,
    //     trader: "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/8453",//9752-25",//6824-10",//3841-240",//8303-15", //7952-8 //6824-10 //8453-50 // 9449-9
    //     gain: 50,
    //     platform: "Wagon",
    //     nodefetchProxy: [],
    //     botChat: "https://hooks.slack.com/services/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",
    //     index: 0
    // },
    // {
    //     key: 'QXvZHULCw7Lzjw5eqB',
    //     secret: '7EZOTNFfLO64tJhNiMt3AzSC64qv2H19ftH1',
    //     testnet: false,
    //     trader: "https://futures.mexc.com/copyFutures/api/v1/trader/orders?limit=10&orderListType=CONTRACT&uid=52519196", //08527742" //59794315 //15439315 // 69843970 //43810576-650
    //     gain: 6,
    //     platform: "Mexc",
    //     nodefetchProxy: [],
    //     botChat: "https://hooks.slack.com/services/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",
    //     index: 1,
    //     simulation: true,
    // },
    // {
    //   key: 'FUTDWUTKODGDKSWNLV',
    //   secret: 'OOJVCPQYRIMCWYGQNDBHFTIIZKRGEGZZJFGQ',
    //   testnet: true,
    // },         //"https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/7293",// "https://futures.mexc.com/copyFutures/api/v1/trader/orders?limit=10&orderListType=CONTRACT&uid=83129161", // 1500, //"Mexc"
    // {
    //     "encryptedUid": "6408AAEEEBF0C76A3D5F0E39C64AAABA",
    //     "tradeType": "PERPETUAL"
    // },
    {
        key: 'vF1sLJWGHRxUEz5GDE',
        secret: 'qEyTXCcWcXJurmikL6j1GZFzCOUi9R4kIbeP',
        testnet: false,
        trader: "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/7857",

        gain: 50,
        platform: "Wagon",
        nodefetchProxy: [],
        botChat: "https://hooks.slack.com/services/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",
        index: 2,
        simulation: false,
    }
    //vF1sLJWGHRxUEz5GDE 'CRYDWOZBKFVRRTDOHN'
    //qEyTXCcWcXJurmikL6j1GZFzCOUi9R4kIbeP MLVUFLNGJEBAOYOYXDJGMZPCDGNREQZTMMJS true
];

export const proxyArr: string[] = [
    // "2.56.119.93:5074:frawsmba:54hwnd9dtyv3",
    // "185.199.229.156:7492:frawsmba:54hwnd9dtyv3",
    // "185.199.228.220:7300:frawsmba:54hwnd9dtyv3",
    // "185.199.231.45:8382:frawsmba:54hwnd9dtyv3",
    // "188.74.210.207:6286:frawsmba:54hwnd9dtyv3",
    // "188.74.183.10:8279:frawsmba:54hwnd9dtyv3",
    // "188.74.210.21:6100:frawsmba:54hwnd9dtyv3",
    // "45.155.68.129:8133:frawsmba:54hwnd9dtyv3",
    // "154.95.36.199:6893:frawsmba:54hwnd9dtyv3",
    // "45.94.47.66:8110:frawsmba:54hwnd9dtyv3"
    "103.69.108.78:8191",
    "154.236.179.229:1976",
    "135.181.14.45:5959",
    "109.196.76.33:3128",
    "167.114.96.13:9300",
    "176.95.54.202:83",
    "64.225.8.115:9996",
    "134.209.189.42:80",
    "143.198.241.47:80",
    "118.185.179.10:80",
    "75.89.101.63:80",
    "51.255.208.33:1991",
    "78.38.93.20:3128",
    "204.157.240.52:999",
    "176.112.157.20:8080",
    "103.146.17.241:80",
    "85.226.30.137:80",
    "15.204.173.243:8118",
    "202.180.54.97:8080",
    "146.59.2.185:80",
    "212.51.144.107:80",
    "136.243.55.199:3128",
    "115.144.8.91:80",
    "124.13.181.6:80",
    "158.69.73.79:9300",
    "85.50.139.97:55443",
    "128.199.202.122:3128",
    "49.249.155.3:80",
    "103.195.245.234:80",
    "197.243.67.99:80",
    "143.42.65.188:8368",
    "12.69.91.227:80",
    "117.54.114.100:80",
    "209.97.150.167:8080",
    "107.6.27.132:80",
    "122.175.58.131:80",
    "198.199.86.11:8080",
    "159.203.61.169:8080",
    "78.28.152.113:80",
    "134.209.29.120:3128",
    "154.113.121.60:80",
    "49.0.250.196:8080",
    "167.71.5.83:8080",
    "61.28.233.217:3128",
    "200.105.215.22:33630",
    "110.34.3.229:3128",
    "51.15.242.202:8888",
    "45.186.60.10:8085",
    "43.251.117.245:45787",
    "148.76.97.250:80",
]

export const nodeFetchProxyArr: string[] = [];

export const traderAPIs: BybitAPI[] = [];

export const sourceToken: string = 'sopGU4ZFPeQr8y3EFDnyWDd8';

export const statusLog = new Logtail(sourceToken);


