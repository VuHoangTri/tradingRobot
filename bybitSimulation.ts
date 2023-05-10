function modPosition(symbol: string, size: string, side: 'Buy' | 'Sell', leverage: string, markPrice: string) {
    const diffPos = position.find(c => c.symbol === symbol);
    if (diffPos === undefined) {
        position.push({ symbol, side, size, leverage, entry: markPrice, markPrice });
    }
    const id = position.findIndex(c => c.symbol === symbol)
    if (id > -1) {
        position[id].markPrice = markPrice;
        const pnl = side === "Buy" ? 1 : -1 *
            (1 - Number(position[id].entry) / Number(position[id].markPrice)) * Number(size);
        const newSize = (Number(size) - Number(position[id].size)).toString();
        if (newSize === '0')
            position.splice(id, 1);
        closedPNL.push({ symbol, size, side: position[id].side, leverage, markPrice, entry: position[id].entry, pnl: pnl.toFixed(4).toString() });
    }
}

const position: {
    symbol: string,
    side: 'Buy' | 'Sell',
    size: string,
    leverage: string,
    entry: string,
    markPrice: string,
}[] = [];
const closedPNL: {
    symbol: string,
    side: 'Buy' | 'Sell',
    size: string,
    leverage: string,
    entry: string,
    markPrice: string,
    pnl: string,
}[] = [];