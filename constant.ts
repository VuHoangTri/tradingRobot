import { Account } from "./interface";

export const INTERVAL = 15000;
export const INTERVALACTION = 500;
export const SIZEBYBIT = 100000000;
export const LEVERAGEBYBIT = 100;
export const BINANCEURL = "https://www.binance.com/bapi/futures/v1/public/future/leaderboard/getOtherPosition";
export const gain = [20, 700, 130, 600];
export const bybitTrader: string[] = [
    "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=dzzffk%2B%2FqGvNboYCRvY38Q%3D%3D", // remove
    // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=4pjjfgTlpIeWNdTARJUWsQ%3D%3D",
    "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=saPU8WuUYBXXebYMgbRDRw%3D%3D",
    // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=O5k95MOucrVPCGiLNW3Xaw%3D%3D",
    "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=ezDycLoNFTp3Exq0IQhD1g%3D%3D"
];
export const wagonTrader: string[] = [
    // "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/4854",
    // "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/6429"  // 8303 // 5363
];
export const binanceTrader: { encryptedUid: string; tradeType: string }[] = [
    // {
    //   "encryptedUid": "8FE17CCE0A3EA996ED7D8B538419C826",
    //   "tradeType": "PERPETUAL"
    // }
]; // 227087068C057B808A83125C8E586BB8 "6408AAEEEBF0C76A3D5F0E39C64AAABA" "8FE17CCE0A3EA996ED7D8B538419C826" "EF6C3AABCBE82294A607E8C94633F082" 
export const hotcoinTrader: string[] = [
    "https://gw.hcglb.com/swap/v1/perpetual/follows/public/trader/currentLead?traderUid=7100137&platform=1&client=1&deviceId=&versionCode=3.0.1&lang=en_US"
]
export const account: Account[] = [
    // {
    //   key: 'QXvZHULCw7Lzjw5eqB',
    //   secret: '7EZOTNFfLO64tJhNiMt3AzSC64qv2H19ftH1',
    //   testnet: true,
    // },
    // {
    //   key: 'FUTDWUTKODGDKSWNLV',
    //   secret: 'OOJVCPQYRIMCWYGQNDBHFTIIZKRGEGZZJFGQ',
    //   testnet: true,
    // },
    // {
    //     key: 'CRYDWOZBKFVRRTDOHN',
    //     secret: 'MLVUFLNGJEBAOYOYXDJGMZPCDGNREQZTMMJS',
    //     testnet: true,
    // }
    {
        key: 'qQ94jsKBk7VJ7yvVsw',
        secret: '1NYC7ffuYcfv2fuW0tv7fc2QczJsQgLrU2Em',
        testnet: false,
    }
];
export const exchangeInfo: any = [];
