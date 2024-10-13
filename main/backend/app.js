const express = require('express');
const cors = require('cors');
const sequelize = require('sequelize');
const path = require('path');

//using curly brackets to call in specific return from a file with multiple functions
const { getStockNamesForTickers, getMarketNews, getCurrentStockPricesForTickers, getTrendingTickers, getIndexes } = require('./yahu_rapidapi');
const { calculateXirrForTicker } = require('./returns_calc')
const { updateHistoricalAssetPrices, updatePortfolioDailyPerformance, recalculateAssetWeightings } = require('./db_updaters')


const app = express();
app.use(cors());

const Asset = require('./models/assets.js');
const Transaction = require('./models/transaction.js');
const Portfolio = require('./models/portfolio.js');
const StockPrice = require('./models/stock_price.js');

// Middleware
app.use(express.json());

// Testing the server URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs.html'));
});

// Run database update scripts for debugging
app.get('/refresh', (req, res) => {
  updateHistoricalAssetPrices();
  updatePortfolioDailyPerformance(false);
  res.status(200).json({error: false, message: "", data:null});
})

// GET request for the current portfolio value
app.get('/portfolio/:time', async (req, res) => {
  await updateHistoricalAssetPrices();
  await updatePortfolioDailyPerformance(false);

  try {
    // Calculate current portfolio value
    const assets = await Asset.findAll({
      order: [['weighting','DESC']]
    });

    var tickers = [];
    assets.forEach(asset => {
      tickers.push(asset.ticker);
    });

    const currentAssetPrides =  await getCurrentStockPricesForTickers(tickers);
    var currentPortfolioValue = 0;
    assets.forEach(asset => {
      currentPortfolioValue += parseFloat(parseFloat(currentAssetPrides[asset.ticker]) * parseFloat(asset.quantity));
    });

    // Get data for graph
    const time = req.params.time.toLowerCase(); // Convert to lowercase
    let portfolioTimeHistory;

    const today = new Date();
    let startDate;

    switch (time) {
      case "week":
        startDate = new Date(today.setDate(today.getDate() - 7)); // 7 days ago
        break;
      case "month":
        startDate = new Date(today.setMonth(today.getMonth() - 1)); // 1 month ago
        break;
      case "3month":
        startDate = new Date(today.setMonth(today.getMonth() - 3)); // 3 months ago
        break;
      case "year":
        startDate = new Date(today.setFullYear(today.getFullYear() - 1)); // 1 year ago
        break;
      case "max":
        portfolioTimeHistory = await Portfolio.findAll(); // Fetch all records
        break;
      default:
        return res.status(422).json({ error: true, message: "Please enter either: day, week, month, year or all", data: null });
    }

    // Fetch most recent history, if weekend data
    if (time != "max") {
      portfolioTimeHistory = await Portfolio.findAll({
        where: {
          timestamp: {
            [sequelize.Op.gte]: startDate // Fetch records from startDate onwards. Greater than or equal to command
          }
        },
        order: [['timestamp', 'ASC']] // Order by timestamp in ascending order
      });
    }

    const totalInvestedRecord = await Asset.findOne({
      attributes: [
          [sequelize.fn('SUM', sequelize.col('book_cost')), 'total_book_cost']
      ]
    });

    var totalInvested = 0
    if (totalInvestedRecord) {
      totalInvested = totalInvestedRecord.get('total_book_cost');
    }

    var returnOnInvestment = 0;
    var percentageReturn = 0

    if (portfolioTimeHistory.length > 0) {
      returnOnInvestment = (currentPortfolioValue - totalInvested).toFixed(2);
      percentageReturn = ((currentPortfolioValue - totalInvested) / totalInvested) * 100;
      percentageReturn = percentageReturn.toFixed(2);
    };

    const firstTransaction = await Transaction.findOne({
      where: {
        timestamp: {
            [sequelize.Op.ne]: null
        }
      },
      order: [['timestamp', 'ASC']],
      limit: 1
    });

    // If a transaction was found, return the timestamp, otherwise return null
    var currentDate = new Date().toDateString();
    var firstTransactionDate = firstTransaction ? new Date(firstTransaction.timestamp).toDateString() : currentDate;

    res.json({ error: false, message: "", data: {
      portfolioTimeHistory: portfolioTimeHistory,
      currentPortfolioValue: currentPortfolioValue.toFixed(2),
      totalInvested: parseFloat(totalInvested).toFixed(2),
      returnOnInvestment: returnOnInvestment,
      percentageReturn: percentageReturn,
      startDate: firstTransactionDate,
      currentDate: currentDate
    } });
  } catch (err) {
    console.error('Error fetching portfolio value:', err);
    res.status(500).json({ error: true, message: "Whoops, an internal server error occurred", data: null });
  }
});


// GET request for the transaction history
app.get('/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      order: [['timestamp', 'DESC']]
    });
    res.json({error: false, message:"", data:transactions});
  } catch (err) {
    console.error('Error fetching transaction history:', err);
    res.status(500).json({error: true, message:"Whoops, an internal server error ocurred", data:null});
  }
});

//GET request for the current assets held
app.get('/assets', async (req, res) => {
  try {
    const assets = await Asset.findAll({
      order: [['weighting','DESC']]
    });
    const assetsToReturn = [];

    var tickers = [];
    assets.forEach(asset => {
      tickers.push(asset.ticker);
    });

    // Get current price for each ticker
    const currentPrices =  await getCurrentStockPricesForTickers(tickers);
    assets.forEach(asset => {
      assetsToReturn.push({
        ticker: asset.ticker,
        quantity: asset.quantity,
        average_purchase_price: asset.avg_purchase_price,
        weighting: asset.weighting,
        current_price: currentPrices[asset.ticker],
        book_cost: asset.book_cost
      })
    });

    res.json({error: false, message:"", data:assetsToReturn});
  } catch (err) {
    console.error('Error fetching assets:', err);
    res.status(500).json({error: true, message:"Whoops, an internal server error ocurred", data:null});
  }
});

//GET request for the current assets return by ticker
app.get('/assets/:ticker', async (req, res) => {
  try {
      const queryTicker = req.params.ticker;
      const rateReturn = await calculateXirrForTicker(queryTicker);
      res.json({error: false, message:"", data: rateReturn});
  } catch (err) {
      console.error('Error displaying:', err);
      res.status(500).json({error: true, message: "Whoops, an internal server error occurred", data: null});
  }
});

//GET request for trending tickers
app.get('/trending', async (req, res) => {
  try {
      const trending = await getTrendingTickers();
      res.json({error: false, message:"", data: trending});
  } catch (err) {
      console.error('Error displaying:', err);
      res.status(500).json({error: true, message: "Whoops, an internal server error occurred", data: null});
  }
});

// GET info for some indexes
app.get('/indexes', async (req, res) => {
  try {
    const indexes = await getIndexes();
    res.json({error: false, message:"", data:indexes});
  } catch (err) {
    console.error('Error fetching transaction history:', err);
    res.status(500).json({error: true, message:"Whoops, an internal server error ocurred", data:null});
  }
});

// Get price for ticker over time from DB
app.get('/history/:ticker', async (req, res) => {
  try {
    const queryTicker = req.params.ticker;
    var stockPrices = await StockPrice.findAll({
      where: {
          ticker: queryTicker
      },
      order: [['timestamp', 'ASC']]
    });

    if (stockPrices.length == 0) {
      await updateHistoricalAssetPrices(); 
    }

    stockPrices = await StockPrice.findAll({
      where: {
          ticker: queryTicker
      },
      order: [['timestamp', 'ASC']]
    });

    res.json({error: false, message:"", data: stockPrices});
  } catch (err) {
      console.error('Error getting indexes:', err);
      res.status(500).json({error: true, message: "Whoops, an internal server error occurred", data: null});
  }
});

app.get('/news/:limit', async(req, res) => {
  try {
    const limit = req.params.limit;
    var news = await getMarketNews(limit);

    const assets = await Asset.findAll({
      order: [['weighting','DESC']]
    });

    var distinctTickers = [];
    assets.forEach(asset => {
      distinctTickers.push(asset.ticker);
    });

    var parsedNews = []
    news.forEach(article => {
      if (distinctTickers.some(item => article.tickers.includes(item))) {
        parsedNews.push({
          title: article.title,
          date: article.date,
          image: article.image,
          provider: article.provider,
          tickers: article.tickers,
          link: article.link,
          forYou: true
        });
      } else {
        parsedNews.push({
          title: article.title,
          date: article.date,
          image: article.image,
          provider: article.provider,
          tickers: article.tickers,
          link: article.link,
          forYou: false
        });
      }
    });

    // Sort by date, then for you. So for you articles always come first
    parsedNews.sort((a, b) => {
      if (a.forYou != b.forYou) {
        return b.forYou - a.forYou;
      }
      return new Date(b.date) - new Date(a.date);
    });

    res.json({error: false, message:"", data: parsedNews })
  } catch (err) {
    console.error('Error getting news:', err);
    res.status(500).json({error: true, message: "Whoops, an internal server error occurred", data: null});
  }
});



// POST request to add a new BUY/SELL transaction and update the assets table
app.post('/transaction', async (req, res) => {
  var { timestamp, ticker, quantity, price, transaction_type } = req.body;

  ticker = ticker.toUpperCase();

  if (!timestamp || !ticker || !quantity || !price || !transaction_type) {
    res.status(400).json({error: true, message:"Missing a required parameter", data:null});
  }

  try {
      // Check if the asset exists in the assets table
      const asset = await Asset.findOne({ where: { ticker } });

      // First check if the ticker is valid
      // If there is already an asset for that ticker, it is clearly valid
      var stock_name = "";
      if (!asset) { 
        var stockNames = await getStockNamesForTickers([ticker]);
        var isInvalid = Object.keys(stockNames).length == 0;

        if (isInvalid) {
          res.status(400).json({error: true, message:"The provided ticker is invalid", data:null});
          return;
        }

        stock_name = stockNames[ticker];
      }

      // Add the transaction to the table
      if (asset) {
          // Update the existing asset based on the new transaction
          let newQuantity;
          let newBookCost;
          let newAveragePrice;

          if (transaction_type == 1) { // Assuming 1 indicates a buy
              newQuantity = parseFloat(asset.quantity) + parseFloat(quantity);
              newBookCost = parseFloat(asset.book_cost) + (quantity * price);
              newAveragePrice = newBookCost / newQuantity;
              
          } else if (transaction_type == 2) { // Assuming 2 indicates a sell
              newQuantity = parseFloat(asset.quantity) - parseFloat(quantity);
              newBookCost = newQuantity > 0 ? (parseFloat(asset.book_cost) * newQuantity / parseFloat(asset.quantity)) : 0;
              newAveragePrice = newBookCost / newQuantity;

              if (newQuantity < 0) {
                res.status(400).json({error: true, message:"You do not have enough of this asset to sell", data:null});
              }
          } else {
            res.status(400).json({error: true, message:"Invalid transaction type", data:null});
            return;
          }

          await asset.update({
              quantity: newQuantity,
              book_cost: newBookCost,
              avg_purchase_price : newAveragePrice,
              updated_at: new Date()
          });

      } else if (transaction_type == 1) { // If asset doesn't exist and it's a buy transaction, create it
          await Asset.create({
              ticker,
              stock_name,
              quantity,
              avg_purchase_price: price,
              current_price: price, // Assuming current price is the purchase price initially
              book_cost: quantity * price,
              updated_at: new Date()
          });
      } else {
        res.status(400).json({error: true, message:"Invalid asset provided", data:null});
        return;
      }

      await Transaction.create({
        timestamp,
        ticker,
        quantity,
        price,
        book_cost: quantity * price,
        transaction_type
      });

      // Recalculate the asset weightings and names
      await updatePortfolioDailyPerformance(true);
      await updateHistoricalAssetPrices(); 
      await recalculateAssetWeightings(stockNames);

      res.status(201).json({error: false, message:"", data:null});
  } catch (err) {
      console.error('Error processing transaction:', err);
      res.status(500).json({error: true, message:"Whoops, an internal server error ocurred", data:null});
  }
});

module.exports = app;