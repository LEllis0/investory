const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockPrice = sequelize.define('StockPrice', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    timestamp: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    ticker: {
        type: DataTypes.STRING(5),
        allowNull: false,
    },
    close_price: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
    },
}, {
    timestamps: false,
    tableName: 'stock_prices',
});

module.exports = StockPrice;
