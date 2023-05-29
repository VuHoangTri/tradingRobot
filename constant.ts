import { Account, Order, Position } from "./interface";
import { BybitAPI } from "./bybit";
import { Logtail } from "@logtail/node";
import { Axios, AxiosProxyConfig } from "axios";

export const INTERVAL = 5000;
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
//ClmRW9sKnHtPqe2iIuoy3w%3D%3D 95
// ]; YSEaUk1iu9%2BrK6f0dMRUzg%3D%3D
// export const wagonList: string[] = [
//     // "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/5363",
//     "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/8303"  // 8303 // 5363 //6429 //9449
// ];
export const binanceTrader: { encryptedUid: string; tradeType: string }[] = [

]; // 227087068C057B808A83125C8E586BB8 "6408AAEEEBF0C76A3D5F0E39C64AAABA" "8FE17CCE0A3EA996ED7D8B538419C826" "EF6C3AABCBE82294A607E8C94633F082"  "8FE17CCE0A3EA996ED7D8B538419C826",
export const hotcoinTrader: string[] = [
    // "https:///wg.flentr.com/swap/v1/perpetual/follows/public/trader/currentLead?traderUid=7100137&platform=1&client=1&deviceId=&versionCode=3.0.1&lang=en_US"
];

// export const mexcTrader: string[] = [
//     'https://futures.mexc.com/copyFutures/api/v1/trader/orders?limit=10&orderListType=CONTRACT&uid=83129161'
//      'https://futures.mexc.com/copyTrade/leader/05126494'
// ]

export const accounts: Account[] = [
    {
        key: 'vF1sLJWGHRxUEz5GDE',
        secret: 'qEyTXCcWcXJurmikL6j1GZFzCOUi9R4kIbeP',
        testnet: false,
        trader: "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/8766",
        gain: 20,
        platform: "Wagon",
        nodefetchProxy: [],
        botChat: "https://hooks.slack.com/services/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",
        index: 1,
        limit: true,
        tP: true,
        fixAmount: true,
        limitPercent: false,
    },
    {
        key: 'CWRVJSQQCDGCWRJHHB',
        secret: 'QGNSGMUPXQBSAWACQFXLVZDIOQPUMVQJMUCY', //
        testnet: false,
        trader: "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/1195",
        gain: 1225,
        platform: "Wagon",
        nodefetchProxy: [],
        botChat: "https://hooks.slack.com/services/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",
        index: 2,
        limit: false,
        tP: false,
        fixAmount: false,
        limitPercent: false,
    },
    {
        key: 'Q85XCeNGI61cKZ0Dwi',//'YWRZNGDBAZIUUPONJQ',
        secret: '2Ncni8kCkjEaaAdB5m4Bn5zhyXrmvb5hQdrW',//'VAYCVXENTCJSUDTUGXSKRXQGNGZSDRUKEGUO',
        testnet: false,
        trader: "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/6429",
        gain: 3000,
        platform: "Wagon",
        nodefetchProxy: [],
        botChat: "https://hooks.slack.com/services/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",
        index: 3,
        limit: false,
        tP: false,
        fixAmount: false,
        limitPercent: false,
    },
    //vF1sLJWGHRxUEz5GDE 'CRYDWOZBKFVRRTDOHN' YWRZNGDBAZIUUPONJQ VAYCVXENTCJSUDTUGXSKRXQGNGZSDRUKEGUO
    //qEyTXCcWcXJurmikL6j1GZFzCOUi9R4kIbeP MLVUFLNGJEBAOYOYXDJGMZPCDGNREQZTMMJS true
];

export const proxyArr: string[] = [
    // "94.131.58.65:6321:frawsmba:54hwnd9dtyv3",
    "64.137.75.68:5988:frawsmba:54hwnd9dtyv3",
    "104.239.84.205:6240:frawsmba:54hwnd9dtyv3",
    "45.131.94.3:5990:frawsmba:54hwnd9dtyv3",
    // "95.164.135.162:6695:frawsmba:54hwnd9dtyv3",
    "45.252.58.203:6832:frawsmba:54hwnd9dtyv3", //new from Sing
    "184.174.58.3:5565:frawsmba:54hwnd9dtyv3",
    "64.137.100.143:5198:frawsmba:54hwnd9dtyv3",
    "119.42.38.4:6186:frawsmba:54hwnd9dtyv3", // new from Sing
    "104.222.187.102:6226:frawsmba:54hwnd9dtyv3",
    "64.137.66.167:5752:frawsmba:54hwnd9dtyv3",
    "161.123.130.69:5740:frawsmba:54hwnd9dtyv3",
    "192.210.132.154:6124:frawsmba:54hwnd9dtyv3",
    "45.252.57.5:6450:frawsmba:54hwnd9dtyv3", // new from Sing
    "45.131.103.77:6063:frawsmba:54hwnd9dtyv3",
    "64.137.60.48:5112:frawsmba:54hwnd9dtyv3",
    "69.58.12.147:8152:frawsmba:54hwnd9dtyv3",
    "119.42.38.85:6267:frawsmba:54hwnd9dtyv3", // new from Sing
    "185.39.8.207:5864:frawsmba:54hwnd9dtyv3",
    "64.137.89.222:6295:frawsmba:54hwnd9dtyv3",
    "45.252.57.96:6541:frawsmba:54hwnd9dtyv3", // new from Sing
    "216.19.217.27:6267:frawsmba:54hwnd9dtyv3",
    "45.83.143.99:6137:frawsmba:54hwnd9dtyv3",
    "38.170.161.132:9183:frawsmba:54hwnd9dtyv3",
    "45.192.157.224:6351:frawsmba:54hwnd9dtyv3",
    "64.137.65.249:6928:frawsmba:54hwnd9dtyv3",
    "45.249.104.166:6461:frawsmba:54hwnd9dtyv3", // new from Sing
    "45.252.57.20:6465:frawsmba:54hwnd9dtyv3", // new from Sing
    "45.249.104.211:6506:frawsmba:54hwnd9dtyv3", // new from Sing
    "154.92.116.111:6423:frawsmba:54hwnd9dtyv3",
    "64.137.93.63:6520:frawsmba:54hwnd9dtyv3",
    "45.249.106.180:5877:frawsmba:54hwnd9dtyv3", // new from SIng
    "119.42.36.123:6023:frawsmba:54hwnd9dtyv3", // new from Sing
    "185.245.27.27:6800:frawsmba:54hwnd9dtyv3",
    "45.192.156.253:6924:frawsmba:54hwnd9dtyv3",
    "216.173.122.50:5777:frawsmba:54hwnd9dtyv3",
    "156.238.10.157:5239:frawsmba:54hwnd9dtyv3",
    "45.41.160.240:6222:frawsmba:54hwnd9dtyv3",
    "109.207.130.194:8201:frawsmba:54hwnd9dtyv3",
    "140.99.120.25:8577:frawsmba:54hwnd9dtyv3",
    "154.73.250.161:6062:frawsmba:54hwnd9dtyv3",
    "209.99.129.226:6214:frawsmba:54hwnd9dtyv3",
    "184.174.27.52:6275:frawsmba:54hwnd9dtyv3",
    "194.146.134.133:5188:frawsmba:54hwnd9dtyv3",
    "104.238.20.248:5870:frawsmba:54hwnd9dtyv3",
    "216.173.103.130:6644:frawsmba:54hwnd9dtyv3",
    "64.137.60.210:5274:frawsmba:54hwnd9dtyv3",
    "104.239.81.205:6740:frawsmba:54hwnd9dtyv3",
    "23.236.216.49:6079:frawsmba:54hwnd9dtyv3",
    "45.61.121.78:6677:frawsmba:54hwnd9dtyv3",
    "64.137.90.140:5760:frawsmba:54hwnd9dtyv3",
    "104.232.211.75:5688:frawsmba:54hwnd9dtyv3",
    "198.23.128.32:5660:frawsmba:54hwnd9dtyv3",
    "64.137.70.20:5571:frawsmba:54hwnd9dtyv3",
    "38.154.194.183:9596:frawsmba:54hwnd9dtyv3",
    "140.99.92.165:9272:frawsmba:54hwnd9dtyv3",
    "154.92.116.205:6517:frawsmba:54hwnd9dtyv3",
    "194.31.162.218:7734:frawsmba:54hwnd9dtyv3",
    "198.46.137.193:6397:frawsmba:54hwnd9dtyv3",
    "45.61.118.186:5883:frawsmba:54hwnd9dtyv3",
    "172.245.158.49:6002:frawsmba:54hwnd9dtyv3",
    "45.192.150.125:6308:frawsmba:54hwnd9dtyv3",
    "206.41.168.33:6698:frawsmba:54hwnd9dtyv3",
    "103.53.216.159:5243:frawsmba:54hwnd9dtyv3",
    "104.238.14.171:6556:frawsmba:54hwnd9dtyv3",
    "140.99.51.89:8395:frawsmba:54hwnd9dtyv3",
    "157.52.174.33:6242:frawsmba:54hwnd9dtyv3",
    "154.85.101.48:5479:frawsmba:54hwnd9dtyv3",
    "154.85.126.18:5025:frawsmba:54hwnd9dtyv3",
    "198.23.214.149:6416:frawsmba:54hwnd9dtyv3",
    "198.154.89.27:6118:frawsmba:54hwnd9dtyv3",
    "45.131.102.216:5868:frawsmba:54hwnd9dtyv3",
    "192.186.185.41:6600:frawsmba:54hwnd9dtyv3",
    "191.102.158.17:8081:frawsmba:54hwnd9dtyv3",
    "184.174.30.184:5853:frawsmba:54hwnd9dtyv3",
    "216.10.27.220:6898:frawsmba:54hwnd9dtyv3",
    "104.143.244.67:6015:frawsmba:54hwnd9dtyv3",
    "161.0.70.25:5614:frawsmba:54hwnd9dtyv3",
    "64.137.49.158:6699:frawsmba:54hwnd9dtyv3",
    "104.238.49.164:5818:frawsmba:54hwnd9dtyv3",
    "154.92.123.184:5522:frawsmba:54hwnd9dtyv3",
    "161.123.154.152:6682:frawsmba:54hwnd9dtyv3",
    "64.137.121.208:6463:frawsmba:54hwnd9dtyv3",
    "104.250.205.40:5787:frawsmba:54hwnd9dtyv3",
    "45.43.189.94:5765:frawsmba:54hwnd9dtyv3",
    "45.61.124.195:6524:frawsmba:54hwnd9dtyv3",
    "104.239.0.71:5772:frawsmba:54hwnd9dtyv3",
    "45.43.183.123:6435:frawsmba:54hwnd9dtyv3",
    "66.78.34.166:5785:frawsmba:54hwnd9dtyv3",
    "154.30.241.66:9777:frawsmba:54hwnd9dtyv3",
    "154.85.100.68:5109:frawsmba:54hwnd9dtyv3",
    "171.22.116.86:6894:frawsmba:54hwnd9dtyv3",
    "64.137.77.128:5563:frawsmba:54hwnd9dtyv3",
    "107.172.156.165:5813:frawsmba:54hwnd9dtyv3",
    "216.173.108.21:6636:frawsmba:54hwnd9dtyv3",
    "45.61.124.159:6488:frawsmba:54hwnd9dtyv3",
    "37.35.41.164:8510:frawsmba:54hwnd9dtyv3",
    "104.239.106.6:5651:frawsmba:54hwnd9dtyv3",
    "23.236.216.232:6262:frawsmba:54hwnd9dtyv3",
    "64.137.106.24:6517:frawsmba:54hwnd9dtyv3",
]

export const nodeFetchProxyArr: string[] = [];

export const axiosProxyArr: AxiosProxyConfig[] = [];

export const traderAPIs: BybitAPI[] = [];

export const sourceToken: string = 'sopGU4ZFPeQr8y3EFDnyWDd8';

export const statusLog = new Logtail(sourceToken);

export const testLev: Position[] = [
    {
        symbol: 'ETHUSDT',
        leverage: '300',
        size: '0',
    }
]

export const testOrder: Order = {
    category: 'linear',
    orderType: 'Limit',
    qty: '0.001',
    side: 'Buy',
    symbol: 'BTCUSDT',
    timeInForce: "GTC",
}


