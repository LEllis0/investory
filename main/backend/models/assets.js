const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Asset = sequelize.define('Asset', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ticker: {
        type: DataTypes.STRING(5),
        allowNull: true
    },
    stock_name: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true
    },
    avg_purchase_price: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true
    },
    book_cost: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    weighting: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: 'assets'
});

module.exports = Asset;