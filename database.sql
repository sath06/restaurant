CREATE DATABASE IF NOT EXISTS sathvika_restaurant
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sathvika_restaurant;

CREATE TABLE IF NOT EXISTS customers (
  customer_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dining_tables (
  table_id INT AUTO_INCREMENT PRIMARY KEY,
  table_number INT NOT NULL UNIQUE,
  seating_capacity INT NOT NULL,
  location VARCHAR(100) NOT NULL,
  status ENUM('Available','Unavailable') NOT NULL DEFAULT 'Available'
);

CREATE TABLE IF NOT EXISTS reservations (
  reservation_id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  table_id INT NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guests INT NOT NULL,
  status ENUM('Pending','Confirmed','Cancelled','Completed') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer FOREIGN KEY (customer_id)
    REFERENCES customers(customer_id) ON DELETE CASCADE,
  CONSTRAINT fk_dining_table FOREIGN KEY (table_id)
    REFERENCES dining_tables(table_id),
  INDEX idx_table_slot (table_id, reservation_date, reservation_time, status)
);

INSERT IGNORE INTO dining_tables (table_number,seating_capacity,location,status) VALUES
(1,2,'Window side','Available'),
(2,2,'Family section','Available'),
(3,4,'Family section','Available'),
(4,4,'Garden view','Available'),
(5,6,'Party section','Available'),
(6,8,'Banquet area','Available');
