const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: true
    },
    ticker: {
        type: DataTypes.STRING(5),
        allowNull: true
    },
    quantity: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true
    },
    book_cost: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true
    },
    transaction_type: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: 'transaction'
});

module.exports = Transaction;