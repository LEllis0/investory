const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Portfolio = sequelize.define('Portfolio', {
    timestamp: {
        type: DataTypes.DATE,
        allowNull: true
    },
    total_value: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: 'portfolio'
});

module.exports = Portfolio;