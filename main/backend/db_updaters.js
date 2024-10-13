const moment = require('moment');
const sequelize = require('./config/database');
const StockPrice = require('./models/stock_price');
const Asset = require('./models/assets.js');
const Transaction = require('./models/transaction.js');
const Portfolio = require('./models/portfolio.js');
const { getPreviousStockPricesForTicker } = require('./yahu_rapidapi');
const { Op } = require('sequelize');

// Update portfolio daily performance
async function updatePortfolioDailyPerformance(forceUpdate) {
    try {
        // Check if we have already calculated the portfolio performance
        const existingDates = await Portfolio.findAll({
          attributes: [[sequelize.fn('DISTINCT', sequelize.col('timestamp')), 'date']],
          raw: true
        });
        const existingDatesSet = new Set(existingDates.map(record => new Date(record.date).toISOString().split('T')[0]));
        
        var yesterday = moment.utc().subtract(1, 'day').startOf('day');
        const dayOfWeek = yesterday.day();
  
        if (dayOfWeek === 6) { // Saturday
          yesterday = yesterday.subtract(1, 'day'); // Move to Friday
        } else if (dayOfWeek === 0) { // Sunday
            yesterday = yesterday.subtract(2, 'days'); // Move to Friday
        }
        yesterday = yesterday.toDate().toISOString().split('T')[0];

        // If we have already calculated portfolio performance, don't recalculate it
        if (existingDatesSet.has(yesterday) && !forceUpdate) {
          return;
        };

        // Get all transactions from the starting date
        const transactions = await Transaction.findAll({
          where: {
            timestamp: {
                [Op.ne]: null
            }
          },
          order: [['timestamp', 'ASC']]
        });

        // Get all stock prices  to current date for tickers in portfolio
        const earliestTransaction = transactions[0].timestamp;

        const historical_prices = await StockPrice.findAll({
          where: {
            timestamp: {
              [Op.gte]: earliestTransaction,
            },
          },
          order: [['timestamp', 'ASC']],
        });

        // Loop through each day from starting date, up to yesterday
        const today = new Date();
        let date = new Date(earliestTransaction);

        // Keep a track of tickers and qty we have
        var currentPortfolio = {}

        // Delete where date greater than the ones we are going to update
        await Portfolio.destroy({
          where: {
            timestamp: {
              [Op.gt]: date,
            },
          },
        });

        var valuesToInsert = [];
        while (date < today) {
            const formattedDate = date.toISOString().split('T')[0];

            // Get transactions for the current date
            const transactionsForDate = transactions.filter(transaction => {
                const transactionDate = new Date(transaction.timestamp).toISOString().split('T')[0];
                return transactionDate === formattedDate;
            });

            // Update current portfolio based on transactions
            transactionsForDate.forEach((transaction) => {
              const quantity = parseFloat(transaction.quantity);
              const ticker = transaction.ticker;

              if (transaction.transaction_type == 1) {
                  if (!(ticker in currentPortfolio)) {
                    currentPortfolio[ticker] = parseFloat(quantity);
                  } else {
                    currentPortfolio[ticker] += parseFloat(quantity);
                  }
              } else if (transaction.transaction_type == 2) {
                  currentPortfolio[ticker] -= parseFloat(quantity);
              }
            });

            // Caclulate portfolio value based on historical data
            var portfolioCurrentValue = 0;
            var missingValues = false;
            for (let ticker in currentPortfolio) {
              const quantityOfShares = currentPortfolio[ticker];
              const historicalPricePerShare = historical_prices.find(record => 
                record.ticker == ticker && record.timestamp == date.toISOString().split('T')[0]
              ); 

              if (!historicalPricePerShare) {
                missingValues = true;
                break;
              }
              
              portfolioCurrentValue += (quantityOfShares * historicalPricePerShare.close_price);
            }

            if (!missingValues) {
              valuesToInsert.push({
                timestamp: new Date(date), // Need to clone for bulk insert
                total_value: portfolioCurrentValue
              });
            }

            // Move to the next day
            date.setDate(date.getDate() + 1);
        }
        
      await Portfolio.bulkCreate(valuesToInsert);
    } catch (error) {
        console.error('Error updating portfolio daily performance:', error);
    }
}

// Update historical prices for assets
async function updateHistoricalAssetPrices() {
    try {
      // Get all current assets from the table
      const assets = await Asset.findAll({
        attributes: ['ticker'],
        group: ['ticker']
      });
  
      // Get the current day and previous day
      var yesterday = moment.utc().subtract(1, 'day').startOf('day');
      const dayOfWeek = yesterday.day();

      if (dayOfWeek === 6) { // Saturday
        yesterday = yesterday.subtract(1, 'day'); // Move to Friday
      } else if (dayOfWeek === 0) { // Sunday
          yesterday = yesterday.subtract(2, 'days'); // Move to Friday
      }
      yesterday = yesterday.toDate().toISOString().split('T')[0];
    
      for (const asset of assets) {
        const ticker = asset.ticker;
  
        // See if we have existing history for the current ticker
        const existingDates = await StockPrice.findAll({
          attributes: [[sequelize.fn('DISTINCT', sequelize.col('timestamp')), 'date']],
          where: { ticker },
          raw: true
        });
  
        const existingDatesSet = new Set(existingDates.map(record => new Date(record.date).toISOString().split('T')[0]));
  
        if (existingDatesSet.has(yesterday)) {
          continue;
        };
  
        // Get historical data from Yahoo Finance
        var historicalData = [];
        try {
          historicalData = await getPreviousStockPricesForTicker(ticker);
        } catch (error) {
            console.log(`ERROR: Could not get historical data for: ${ticker}`)
        }

        // Prepare the data fto be inserted, but exclude any dates we alread have
        const stockPricesToInsert = Object.entries(historicalData)
          .filter(([date]) => !existingDatesSet.has(new Date(date).toISOString().split('T')[0]))
          .map(([date, close]) => ({
            ticker,
            timestamp: new Date(date),
            close_price: close
          }));

        // Insert historical data into the StockPrice table
        if (stockPricesToInsert.length > 0) {
          console.log("Updating the historical data");
          await StockPrice.bulkCreate(stockPricesToInsert);
        }
      }
    } catch (error) {
      console.error('Error updating historical asset prices:', error);
    }
  }

  async function recalculateAssetWeightings() {
    try {
      const assets = await Asset.findAll();
  
      let totalQuantity = 0;
  
      // For each asset add to the total quantity, and check if they have a stock name
      assets.forEach(asset => {
        totalQuantity += parseFloat(asset.quantity || 0);
      });
  
      if (totalQuantity === 0) {
        return;
      }
  
      // Go through and update asset names and weightings
      for (const asset of assets) {

        if (asset.quantity == 0) {
          Asset.destroy({
            where: {
              id: {
                [Op.eq]: asset.id,
              },
            }
          })
          asset.destroy();
        }
        
        const weighting = ((parseFloat(asset.quantity || 0) / totalQuantity) * 100).toFixed(1);
        await asset.update({ weighting });
      }
  
    } catch (error) {
      console.error("Error recalculating asset weightings:", error); // throw error here instead and handle
    }
  }


  module.exports = { updateHistoricalAssetPrices, updatePortfolioDailyPerformance, recalculateAssetWeightings };
