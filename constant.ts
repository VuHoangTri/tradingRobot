export const INTERVAL = 30000;
export const INTERVALACTION = 500;
export const SIZEBYBIT = 100000000;
export const LEVERAGEBYBIT = 100;
export const BINANCEURL = "https://www.binance.com/bapi/futures/v1/public/future/leaderboard/getOtherPosition";
export const gain = [130, 700, 600];
export const bybitTrader: string[] = [
    "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=dzzffk%2B%2FqGvNboYCRvY38Q%3D%3D", // remove
    // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=4pjjfgTlpIeWNdTARJUWsQ%3D%3D",
    "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=saPU8WuUYBXXebYMgbRDRw%3D%3D",
    // "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=O5k95MOucrVPCGiLNW3Xaw%3D%3D",
    "https://api2.bybit.com/fapi/beehive/public/v1/common/position/list?leaderMark=ezDycLoNFTp3Exq0IQhD1g%3D%3D"
];
export const wagonTrader: string[] = [
    // "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/4854",
    "https://www.traderwagon.com/v1/friendly/social-trading/lead-portfolio/get-position-info/6260"//8698" // 6260 9189
];
export const binanceTrader: { encryptedUid: string; tradeType: string }[] = [
    // {
    //   "encryptedUid": "8FE17CCE0A3EA996ED7D8B538419C826",
    //   "tradeType": "PERPETUAL"
    // }
]; // 227087068C057B808A83125C8E586BB8 "6408AAEEEBF0C76A3D5F0E39C64AAABA" "8FE17CCE0A3EA996ED7D8B538419C826" "EF6C3AABCBE82294A607E8C94633F082" 
export const exchangeInfo: any = [];
