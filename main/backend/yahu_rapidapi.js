require('dotenv').config();
const axios = require('axios');

let stock_names_for_tickers = {}
let stock_price_cache = {}

let market_news_last_updated = new Date(-8640000000000000);
let market_news_cache = []

let trending_stocks_last_updated =  new Date(-8640000000000000);
let trending_stocks_cache = []

let indexes_last_updated =  new Date(-8640000000000000);
let indexes_cache = []

async function getStockNamesForTickers(tickers) { 
  var fetchFromApi = false;
  tickers.forEach(ticker => {
    if (!(ticker in stock_names_for_tickers)) {
      fetchFromApi = true;
    }
  })

  if (!fetchFromApi) {
    return stock_names_for_tickers;
  }
 
  const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes`; //API endpoint for Yahoo Finance
  const apiKey = process.env.YAHU_API_KEY;

  const options = { 
    method: 'GET',
    url: apiUrl,
    params: { 
        region: 'US',
        symbols: tickers.join(',') 
    },
    headers: {
      'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    }
  };

  // Making the API request 
  try {
    const response = await axios.request(options);
    const quotes = response.data.quoteResponse.result;

    // Create a dictionary of stock tickers to their names
    const stockNames = {};
    quotes.forEach(quote => {
      if (quote.quoteType != 'ECNQUOTE') {
        stockNames[quote.symbol] = quote.shortName;
        stock_names_for_tickers[quote.symbol] = quote.shortName;
      }
    });

    return stockNames;

  } catch (error) {
    console.error("Error fetching stock names from Yahu RapidAPI: ", error);
    throw error;
  }
}

async function getCurrentStockPricesForTickers(tickers) {
  var cachedStockPrices = {}
  var fetchFromApi = false

  tickers.forEach(ticker => {
    if (ticker in stock_price_cache) {
      var cachedResult = stock_price_cache[ticker];
      
      var currentTime = new Date().getTime();
      var cacheTime = cachedResult.timestamp.getTime();

      var differenceInMilliseconds = Math.abs(currentTime - cacheTime);
      var differenceInMinutes = (differenceInMilliseconds / 1000) / 60;
      
      if (differenceInMinutes <= 30) {
        cachedStockPrices[ticker] = cachedResult.price;
      } else {
        fetchFromApi = true;
      }
    } else {
      fetchFromApi = true;
    }
  })

  if (!fetchFromApi) {
    return cachedStockPrices;
  }

  const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes`;
  const apiKey = process.env.YAHU_API_KEY;

  const options = {
    method: 'GET',
    url: apiUrl,
    params: { 
        region: 'US',
        symbols: tickers.join(',') 
    },
    headers: {
      'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    }
  };

  try {
    const response = await axios.request(options);
    const quotes = response.data.quoteResponse.result;

    // Create a dictionary of stock tickers to their prices
    const currentStockPrices = {};
    quotes.forEach(quote => {
      currentStockPrices[quote.symbol] = quote.regularMarketPrice;
      
      stock_price_cache[quote.symbol] = {
        timestamp: new Date(),
        price: quote.regularMarketPrice
      }
    });
    
    return currentStockPrices;

  } catch (error) {
    console.error("Error fetching current stock prices from Yahu RapidAPI: ", error);
    throw error;
  }
}

async function getPreviousStockPricesForTicker(ticker) {
  const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v3/get-historical-data`;
  const apiKey = process.env.YAHU_API_KEY;

  const options = {
    method: 'GET',
    url: apiUrl,
    params: { 
      region: 'US',
      symbol: ticker
    },
    headers: {
      'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    }
  };

  try {
    const response = await axios.request(options);
    const prices = response.data.prices;

    // Create a dictionary of dates to the stocks closing price
    const closeStockPrices = {};
    prices.forEach(price => { 
      const dateInMilliseconds = price.date * 1000;
      const date = new Date(dateInMilliseconds);

      if (price.close != null) {
        closeStockPrices[date] = price.close;
      }
    });

    return closeStockPrices;

  } catch (error) {
    console.error("Error fetching historical stock prices from Yahu RapidAPI: ", error);
    throw error;
  }
}

async function getMarketNews(limit) {
  if (limit > 100) {
    limit = 100;
  };
      
  var currentTime = new Date().getTime();
  var cacheTime = market_news_last_updated.getTime();
  var differenceInMilliseconds = Math.abs(currentTime - cacheTime);
  var differenceInMinutes = (differenceInMilliseconds / 1000) / 60;
  
  if (differenceInMinutes <= 30) {
    return getFilteredNews(market_news_cache, limit);
  }

  const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/news/v2/list?region=US&snippetCount=100`;
  const apiKey = process.env.YAHU_API_KEY;

  const options = {
    method: 'POST',
    url: apiUrl,
    params: {},
    headers: {
      'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    }
  };

  try {
    const response = await axios.request(options);
    const rawArticles = response.data.data.main.stream;
    
    market_news_cache = rawArticles;
    market_news_last_updated = new Date();
    
    // Go through articles and get the data we want
    return getFilteredNews(rawArticles, limit);

  } catch (error) {
    console.error("Error fetching market news from Yahu RapidAPI: ", error);
    throw error;
  }
}

function getFilteredNews(rawArticles, limit) {
  var articles = [];
  rawArticles.forEach(article => { 
    const data = article.content;
    if (
        data.contentType == "STORY" && 
        data.clickThroughUrl && 
        data.thumbnail?.resolutions[0]?.url &&
        data.finance?.stockTickers?.length > 0 &&
        articles.length < limit
      ) {
        articles.push({
          title: data.title,
          date: data.pubDate,
          image: data.thumbnail.resolutions[0].url,
          provider: data.provider.displayName,
          tickers: data.finance.stockTickers.map(x => x.symbol),
          link: data.clickThroughUrl.url
        })
      }
  });

  return articles;
}

async function getTrendingTickers() {
  var currentTime = new Date().getTime();
  var cacheTime = trending_stocks_last_updated.getTime();
  var differenceInMilliseconds = Math.abs(currentTime - cacheTime);
  var differenceInMinutes = (differenceInMilliseconds / 1000) / 60;
  
  if (differenceInMinutes <= 30) {
    const trendingStocks = [];
    trending_stocks_cache.forEach(quote => {
      trendingStocks.push({
        ticker: quote.symbol,
        price: quote.regularMarketPrice,
        change_percentage: (Math.round(quote.regularMarketChangePercent * 100) / 100).toFixed(2)
      });
    });

    return trendingStocks;
  }

  const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/get-trending-tickers`;
  const apiKey = process.env.YAHU_API_KEY;

  const options = {
    method: 'GET',
    url: apiUrl,
    params: { },
    headers: {
      'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    }
  };

  try {
    const response = await axios.request(options);
    var trending = response.data.finance.result[0].quotes;

    trending_stocks_cache = trending;
    trending_stocks_last_updated = new Date();

    // Create a dictionary of stock tickers to their prices
    const trendingStocks = [];
    trending.forEach(quote => {
      trendingStocks.push({
        ticker: quote.symbol,
        price: quote.regularMarketPrice,
        change_percentage: (Math.round(quote.regularMarketChangePercent * 100) / 100).toFixed(2)
      });
    });

    return trendingStocks;

  } catch (error) {
    console.error("Error fetching trending stocks from Yahu RapidAPI: ", error);
    throw error;
  }
}

async function getIndexes() {
  var indexSymbols = ["^FTSE", "^GSPC", "^N225", "^RUT", "BTC-USD", "^IXIC"];

  var currentTime = new Date().getTime();
  var cacheTime = indexes_last_updated.getTime();
  var differenceInMilliseconds = Math.abs(currentTime - cacheTime);
  var differenceInMinutes = (differenceInMilliseconds / 1000) / 60;
  
  if (differenceInMinutes <= 30) {
    const parsedIndexes = [];
    indexes_cache.forEach(quote => {
      var percentageChange = (((quote.regularMarketPrice - quote.regularMarketPreviousClose) / quote.regularMarketPrice) * 100).toFixed(2);
      var positive = true;
      if (percentageChange < 0) {
        positive = false;
        percentageChange = Math.abs(percentageChange)
      }

      parsedIndexes.push({
        name: quote.shortName,
        ticker: quote.symbol,
        currentPrice: quote.regularMarketPrice,
        previousClose: quote.regularMarketPreviousClose,
        percentChange: percentageChange,
        positiveChange: positive
      });
    });

    return parsedIndexes;
  }

  const apiUrl = `https://apidojo-yahoo-finance-v1.p.rapidapi.com/market/v2/get-quotes`;
  const apiKey = process.env.YAHU_API_KEY;

  const options = {
    method: 'GET',
    url: apiUrl,
    params: { 
      region: 'US',
      symbols: indexSymbols.join(','),
    },
    headers: {
      'x-rapidapi-host': 'apidojo-yahoo-finance-v1.p.rapidapi.com',
      'x-rapidapi-key': apiKey
    }
  };

  try {
    const response = await axios.request(options);
    var indexes = response.data.quoteResponse.result;

    indexes_cache = indexes;
    indexes_last_updated = new Date();    

    // Create a dictionary of stock tickers to their prices
    var parsedIndexes = [];
    indexes.forEach(quote => {
      var percentageChange = (((quote.regularMarketPrice - quote.regularMarketPreviousClose) / quote.regularMarketPrice) * 100).toFixed(2);
      var positive = true;
      if (percentageChange < 0) {
        positive = false;
        percentageChange = Math.abs(percentageChange)
      }

      parsedIndexes.push({
        name: quote.shortName,
        ticker: quote.symbol,
        currentPrice: quote.regularMarketPrice,
        previousClose: quote.regularMarketPreviousClose,
        percentChange: percentageChange,
        positiveChange: positive
      });
    });

    return parsedIndexes;

  } catch (error) {
    console.error("Error fetching trending stocks from Yahu RapidAPI: ", error);
    throw error;
  }
}

module.exports = { getStockNamesForTickers, getCurrentStockPricesForTickers, getPreviousStockPricesForTicker, getMarketNews, getTrendingTickers, getIndexes };
