import { Account, Order, Position } from "./interface";
import { BybitAPI } from "./bybit";
import { Logtail } from "@logtail/node";
import { Axios, AxiosProxyConfig } from "axios";

export const INTERVAL = 5000;
export const INTERVALACTION = 500;
export const SIZEBYBIT = 100000000;
export const LEVERAGEBYBIT = 100;
const BINANCEURL = "https://www.binance.com/bapi/futures/v1/public/future/leaderboard/getOtherPosition";
const BTCEXURL = "https://api.btcex.com/api/v1/public/copy/currentPositionsList";
const OKXURL = "https://www.okx.com/priapi/v5/ecotrade/public/position-summary";
const GATEURL = "https://www.gate.io/api/copytrade/copy_trading/trader/position";
const HOTCOINURL = "https://wg.flentr.com/swap/v1/perpetual/follows/public/trader/currentLead";
const MEXCURL = "https://futures.mexc.com/copyFutures/api/v1/trader/orders";
const BYBITURL = "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list";
const XTURL = "https://www.xt.com/fapi/trade/v1/public/copy-trade/leader-order-page";
const HOUBIURL = "https://www.huobi.com/futures/api/-/x/hbg/v1/copytrading/trader/open-unmatch-orders";
const WAGONURL = "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/";  //9980-312 10464-2500


export const accounts: Account[] = [
    // {
    //     key: 'vF1sLJWGHRxUEz5GDE',
    //     secret: 'qEyTXCcWcXJurmikL6j1GZFzCOUi9R4kIbeP',
    //     trader: "8766",
    //     gain: 20,
    //     platform: "Wagon",
    //     index: 1,
    //     tP: false,
    //     fixAmount: false,
    //     limitPercent: false,
    //     url: WAGONURL
    // },
    {
        key: 'WKPVGIPENYCOFPKGUY', //GreyAcc2
        secret: 'VVPEMIKQUWLDUCHXGFBYVQTFEEVTLJDYSBXZ',
        trader: '?t=1686239333610&uniqueName=22343FB9B4B0064E',
        gain: 1,//1217,
        platform: "OKX",
        index: 2,
        tP: false,
        limitPercent: true,
        url: OKXURL,
    },
    {
        key: 'CWRVJSQQCDGCWRJHHB',  //GreyNguyen1
        secret: 'QGNSGMUPXQBSAWACQFXLVZDIOQPUMVQJMUCY', //
        trader: "1195",
        gain: 1,//4078,
        platform: "Wagon",
        index: 1,
        tP: false,
        limitPercent: false,
        url: WAGONURL
    },
    {
        key: 'VINQISCRJYBDKPXVKP',
        secret: 'APFTAMFNCNRIEQBNWBYZAERHKKVAFABZLMUW',
        trader:
        {
            "encryptedUid": "4325641055745EBAFED26DB3ACDC7AF1", //B6EF34B1C875FF4097AF51FF73868E70 
            "tradeType": "PERPETUAL"
        },
        gain: 1,//255,
        platform: "Binance",
        index: 3,
        tP: false,
        limitPercent: false,
        url: BINANCEURL
    },
    // {
    //     key: 'VINQISCRJYBDKPXVKP',
    //     secret: 'APFTAMFNCNRIEQBNWBYZAERHKKVAFABZLMUW',
    //     trader: '9980',
    //     gain: 1640,
    //     platform: "Wagon",
    //     index: 5,
    //     fixAmount: false,
    //     lOpen: true,
    //     lAdjust: true,
    //     tP: false,
    //     limitPercent: false,
    //     url: WAGONURL
    // },
    // {
    //     key: 'LRXZVMDFHDVIRMMXZD',  // BHOPRJSBFGKHYPLYEY
    //     secret: 'RCUJBNJSGELXUKLLVWANIKELKMSUCHGHUGAQ',  //YNNBOXGRGHBPBKLTLJNIARVHJPFGWXAVBRMN 
    //     trader: "?traderUid=7001020&platform=1&client=1&deviceId=&versionCode=3.0.1&lang=en_US",
    //     gain: 100,
    //     platform: "Hotcoin",
    //     index: 4,
    //     fixAmount: true,
    //     tP: false,
    //     limitPercent: true,
    //     url: HOTCOINURL
    // },
    {
        key: 'Q85XCeNGI61cKZ0Dwi',//'YWRZNGDBAZIUUPONJQ',
        secret: '2Ncni8kCkjEaaAdB5m4Bn5zhyXrmvb5hQdrW',//'VAYCVXENTCJSUDTUGXSKRXQGNGZSDRUKEGUO',
        trader: "6429",
        gain: 3980,
        platform: "Wagon",
        index: 0,
        tP: false,
        limitPercent: false,
        url: WAGONURL
    }

    //vF1sLJWGHRxUEz5GDE 'CRYDWOZBKFVRRTDOHN' YWRZNGDBAZIUUPONJQ VAYCVXENTCJSUDTUGXSKRXQGNGZSDRUKEGUO //WKPVGIPENYCOFPKGUY VVPEMIKQUWLDUCHXGFBYVQTFEEVTLJDYSBXZ
    //qEyTXCcWcXJurmikL6j1GZFzCOUi9R4kIbeP MLVUFLNGJEBAOYOYXDJGMZPCDGNREQZTMMJS true
];

export const proxyArr: string[] = [
    "64.137.75.68:5988:frawsmba:54hwnd9dtyv3",
    "104.239.84.205:6240:frawsmba:54hwnd9dtyv3",
    "64.137.60.48:5112:frawsmba:54hwnd9dtyv3",
    "216.173.122.50:5777:frawsmba:54hwnd9dtyv3",
    "156.238.10.157:5239:frawsmba:54hwnd9dtyv3",
    "104.238.20.248:5870:frawsmba:54hwnd9dtyv3",
    "64.137.60.210:5274:frawsmba:54hwnd9dtyv3",
    "64.137.90.140:5760:frawsmba:54hwnd9dtyv3",
    "194.31.162.218:7734:frawsmba:54hwnd9dtyv3",
    "103.53.216.159:5243:frawsmba:54hwnd9dtyv3",
    "104.238.14.171:6556:frawsmba:54hwnd9dtyv3",
    "154.85.126.18:5025:frawsmba:54hwnd9dtyv3",
    "64.137.49.158:6699:frawsmba:54hwnd9dtyv3",
    "107.172.156.165:5813:frawsmba:54hwnd9dtyv3",
    "43.229.9.202:6471:frawsmba:54hwnd9dtyv3",
    "104.238.20.141:5763:frawsmba:54hwnd9dtyv3",
    "103.53.219.69:6162:frawsmba:54hwnd9dtyv3",
    "216.173.74.190:5870:frawsmba:54hwnd9dtyv3",
    "206.41.169.174:5754:frawsmba:54hwnd9dtyv3",
    "64.137.62.9:5654:frawsmba:54hwnd9dtyv3",
    "103.53.216.95:5179:frawsmba:54hwnd9dtyv3",
    "104.239.33.52:6407:frawsmba:54hwnd9dtyv3",
    "161.123.215.135:6746:frawsmba:54hwnd9dtyv3",
    "104.238.7.125:6052:frawsmba:54hwnd9dtyv3",
    "45.252.58.203:6832:frawsmba:54hwnd9dtyv3",
    "119.42.38.4:6186:frawsmba:54hwnd9dtyv3",
    "216.158.205.48:6276:frawsmba:54hwnd9dtyv3",
    "206.41.174.95:6050:frawsmba:54hwnd9dtyv3",
    "104.239.37.52:5704:frawsmba:54hwnd9dtyv3",
    "64.137.90.119:5739:frawsmba:54hwnd9dtyv3",
    "104.239.38.242:6775:frawsmba:54hwnd9dtyv3",
    "45.114.12.177:5245:frawsmba:54hwnd9dtyv3",
    "104.233.20.172:6188:frawsmba:54hwnd9dtyv3",
    "161.123.215.1:6612:frawsmba:54hwnd9dtyv3",
    "45.252.57.5:6450:frawsmba:54hwnd9dtyv3",
    "45.249.106.180:5877:frawsmba:54hwnd9dtyv3",
    "206.41.174.130:6085:frawsmba:54hwnd9dtyv3",
    "119.42.38.85:6267:frawsmba:54hwnd9dtyv3",
    "161.123.209.90:6590:frawsmba:54hwnd9dtyv3",
    "104.239.41.29:6384:frawsmba:54hwnd9dtyv3",
    "45.252.57.96:6541:frawsmba:54hwnd9dtyv3",
    "104.239.38.110:6643:frawsmba:54hwnd9dtyv3",
    "104.239.13.158:6787:frawsmba:54hwnd9dtyv3",
    "45.249.104.166:6461:frawsmba:54hwnd9dtyv3",
    "64.137.90.90:5710:frawsmba:54hwnd9dtyv3",
    "45.252.57.20:6465:frawsmba:54hwnd9dtyv3",
    "45.249.104.211:6506:frawsmba:54hwnd9dtyv3",
    "64.137.126.78:6686:frawsmba:54hwnd9dtyv3",
    "104.238.7.27:5954:frawsmba:54hwnd9dtyv3",
    "43.229.9.95:6364:frawsmba:54hwnd9dtyv3",
    "119.42.36.123:6023:frawsmba:54hwnd9dtyv3",
    "103.101.90.93:6358:frawsmba:54hwnd9dtyv3",
    "104.238.7.206:6133:frawsmba:54hwnd9dtyv3",
    "45.249.104.122:6417:frawsmba:54hwnd9dtyv3",
    "45.114.12.245:5313:frawsmba:54hwnd9dtyv3",
    "119.42.36.220:6120:frawsmba:54hwnd9dtyv3",
    "45.114.12.128:5196:frawsmba:54hwnd9dtyv3",
    "119.42.38.164:6346:frawsmba:54hwnd9dtyv3",
    "64.137.75.231:6151:frawsmba:54hwnd9dtyv3",
    "45.249.104.143:6438:frawsmba:54hwnd9dtyv3",
    "103.101.90.138:6403:frawsmba:54hwnd9dtyv3",
    "45.249.106.138:5835:frawsmba:54hwnd9dtyv3",
    "119.42.39.216:5844:frawsmba:54hwnd9dtyv3",
    "104.238.7.155:6082:frawsmba:54hwnd9dtyv3",
    "45.252.58.181:6810:frawsmba:54hwnd9dtyv3",
    "104.239.73.67:6610:frawsmba:54hwnd9dtyv3",
    "45.249.104.125:6420:frawsmba:54hwnd9dtyv3",
    "104.239.73.10:6553:frawsmba:54hwnd9dtyv3",
    "119.42.38.244:6426:frawsmba:54hwnd9dtyv3",
    "119.42.36.221:6121:frawsmba:54hwnd9dtyv3",
    "119.42.38.133:6315:frawsmba:54hwnd9dtyv3",
    "119.42.39.191:5819:frawsmba:54hwnd9dtyv3",
    "103.101.90.97:6362:frawsmba:54hwnd9dtyv3",
    "45.249.106.110:5807:frawsmba:54hwnd9dtyv3",
    "119.42.36.244:6144:frawsmba:54hwnd9dtyv3",
    "45.252.57.212:6657:frawsmba:54hwnd9dtyv3",
    "103.101.88.70:5794:frawsmba:54hwnd9dtyv3",
    "45.252.58.161:6790:frawsmba:54hwnd9dtyv3",
    "45.249.104.197:6492:frawsmba:54hwnd9dtyv3",
    "43.229.11.136:5774:frawsmba:54hwnd9dtyv3",
    "103.101.88.152:5876:frawsmba:54hwnd9dtyv3",
    "45.252.57.183:6628:frawsmba:54hwnd9dtyv3",
    "103.101.90.47:6312:frawsmba:54hwnd9dtyv3",
    "104.238.7.49:5976:frawsmba:54hwnd9dtyv3",
    "119.42.39.163:5791:frawsmba:54hwnd9dtyv3",
    "119.42.38.239:6421:frawsmba:54hwnd9dtyv3",
    "103.101.88.244:5968:frawsmba:54hwnd9dtyv3",
    "103.101.90.192:6457:frawsmba:54hwnd9dtyv3",
    "103.101.90.130:6395:frawsmba:54hwnd9dtyv3",
    "103.101.88.158:5882:frawsmba:54hwnd9dtyv3",
    "103.101.88.11:5735:frawsmba:54hwnd9dtyv3",
    "103.101.88.2:5726:frawsmba:54hwnd9dtyv3",
    "103.101.88.199:5923:frawsmba:54hwnd9dtyv3",
    "103.101.90.76:6341:frawsmba:54hwnd9dtyv3",
    "103.101.90.197:6462:frawsmba:54hwnd9dtyv3",
    "103.101.88.79:5803:frawsmba:54hwnd9dtyv3",
    "103.101.88.163:5887:frawsmba:54hwnd9dtyv3",
    "103.101.88.94:5818:frawsmba:54hwnd9dtyv3",
    "103.101.90.200:6465:frawsmba:54hwnd9dtyv3",
    "103.101.90.34:6299:frawsmba:54hwnd9dtyv3",
]

export const nodeFetchProxyArr: string[] = [];

export const axiosProxyArr: AxiosProxyConfig[] = [];

export const traderAPIs: BybitAPI[] = [];

export const sourceToken: string = 'sopGU4ZFPeQr8y3EFDnyWDd8';

export const statusLog = new Logtail(sourceToken);

export const testLev: Position[] = [
    {
        symbol: 'ETHUSDT',
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


