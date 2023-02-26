import {
    InverseClient,
    LinearClient,
    InverseFuturesClient,
    SpotClientV3,
    UnifiedMarginClient,
    USDCOptionClient,
    USDCPerpetualClient,
    AccountAssetClient,
    CopyTradingClient,
    TickerLinearInverseV5,
    RestClientV5,
    TickerOptionV5,
    TickerSpotV5,
} from 'bybit-api';


const API_KEY = 'GJJ2ZtB6THPcj5a955';
const API_SECRET = 'gxxu2TViRHDqCnbyX85EpGxxBXEOms8nLZfY';
const useTestnet = true;

const client = new RestClientV5({
    key: API_KEY,
    secret: API_SECRET,
    testnet: useTestnet
},
    // requestLibraryOptions
);

// For public-only API calls, simply don't provide a key & secret or set them to undefined
// const client = new RestClientV5({});
export function getAccountByBit() {
    const res1 = client.getPrivate('/v5/market/tickers?category=inverse&symbol=BTCUSDT')
        .then(res => { return res.result.list[0].markPrice });
    const res = client.getTickers({
        category: "linear",
        symbol: "BTCUSDT",
    })
        .then(result => { return result.result.list[0]; });
    const info = client.getAccountInfo()
        .then(result => {
            console.log("getAccountInfo result: ", result);
            return result.result;
        })
        .catch(err => {
            console.error("getAccountInfo error: ", err);
        });
    return res1;
}

export function getMarkPrice(symbol: string): Promise<string> {
    const res = client.getPrivate('/v5/market/tickers?category=inverse&symbol=' + symbol)
        .then(res => { return res.result.list[0].markPrice });
    return res;
}

