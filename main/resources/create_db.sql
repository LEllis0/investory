-- Setup Production Database
USE prod;

CREATE TABLE IF NOT EXISTS assets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticker VARCHAR(5),
    stock_name VARCHAR(50),
    quantity DECIMAL(10, 4),
    avg_purchase_price DECIMAL(10, 4),
    book_cost DECIMAL(20, 4),
    updated_at DATE,
    weighting DECIMAL(4,1)
);

CREATE TABLE IF NOT EXISTS transaction (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timestamp DATE,
    ticker VARCHAR(5),
    quantity DECIMAL(10, 4),
    price DECIMAL(10, 4),
    book_cost DECIMAL(20, 4),
    transaction_Type INT
);

CREATE TABLE IF NOT EXISTS portfolio (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timestamp DATE,
    total_value DECIMAL(10, 4)
);

CREATE TABLE stock_prices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timestamp DATE NOT NULL,
    ticker VARCHAR(5) NOT NULL,
    close_price DECIMAL(10, 4) NOT NULL
);

-- Setup Staging Database
USE staging;

CREATE TABLE IF NOT EXISTS assets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticker VARCHAR(5),
    stock_name VARCHAR(50),
    quantity DECIMAL(10, 4),
    avg_purchase_price DECIMAL(10, 4),
    book_cost DECIMAL(20, 4),
    updated_at DATE,
    weighting DECIMAL(4,1)
);

CREATE TABLE IF NOT EXISTS transaction (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timestamp DATE,
    ticker VARCHAR(5),
    quantity DECIMAL(10, 4),
    price DECIMAL(10, 4),
    book_cost DECIMAL(20, 4),
    transaction_Type INT
);

CREATE TABLE IF NOT EXISTS portfolio (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timestamp DATE,
    total_value DECIMAL(10, 4)
);

CREATE TABLE stock_prices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    timestamp DATE NOT NULL,
    ticker VARCHAR(5) NOT NULL,
    close_price DECIMAL(10, 4) NOT NULL
);
