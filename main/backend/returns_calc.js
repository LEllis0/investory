const xirr = require('xirr');
const { getCurrentStockPricesForTickers } = require('./yahu_rapidapi');
const Transaction = require('./models/transaction');
const Asset = require('./models/assets');

async function calculateXirrForTicker(ticker) {
    try {
        // Pull all transactions for the given ticker
        const tickerTransactions = await Transaction.findAll({
            where: { ticker }
        });

        if (!tickerTransactions.length) {
            throw new Error('No transactions found for this ticker');
        }

        // Prepare the transactions for the XIRR calculation
        let xirrData = tickerTransactions.map(transaction => {
            // For XIRR, purchases are negative, sales are positive
            const amount = transaction.transaction_type === 1 ? 
                -parseFloat(transaction.book_cost) : 
                parseFloat(transaction.book_cost);
            return {
                amount,
                when: new Date(transaction.timestamp)
            };
        });

        // Fetch current market prices for the ticker
        const tickersToCurrentMarketPrices = await getCurrentStockPricesForTickers([ticker]);
        const currentMarketPrice = tickersToCurrentMarketPrices[ticker];

        // Fetch the current quantity of the asset
        const asset = await Asset.findOne({
            where: { ticker },
            attributes: ['quantity']
        });

        if (!asset) {
            throw new Error('Asset not found');
        }

        const currentQuantity = parseFloat(asset.quantity);
        const finalCashFlow = currentMarketPrice * currentQuantity;

        // Push the final cash flow needed for the XIRR calculation
        xirrData.push({
            amount: finalCashFlow,
            when: new Date() // Use the current date
        });

        // Calculate the XIRR for the holding
        const rate = xirr(xirrData);
        return rate;
    } catch (err) {
        console.error('Error calculating XIRR:', err);
        throw err;
    }
}

module.exports = { calculateXirrForTicker };
