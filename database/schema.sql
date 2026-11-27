CREATE DATABASE IF NOT EXISTS courierflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE courierflow;

CREATE TABLE IF NOT EXISTS users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 legacy_id VARCHAR(80) NULL UNIQUE,
 name VARCHAR(160) NOT NULL,
 username VARCHAR(100) NOT NULL UNIQUE,
 email VARCHAR(190) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 phone VARCHAR(40) NULL,
 nif VARCHAR(20) NULL,
 role ENUM('client','courier','staff','admin') NOT NULL,
 approval_status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
 approved_by BIGINT UNSIGNED NULL,
 last_lat DECIMAL(10,7) NULL,
 last_lng DECIMAL(10,7) NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vehicle_types (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(60) NOT NULL UNIQUE,
 max_weight_kg DECIMAL(12,3) NOT NULL,
 max_volume_m3 DECIMAL(12,5) NOT NULL,
 CHECK (max_weight_kg > 0), CHECK (max_volume_m3 > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS vehicles (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 courier_id BIGINT UNSIGNED NOT NULL,
 vehicle_type_id INT UNSIGNED NOT NULL,
 model VARCHAR(140) NOT NULL,
 license_plate VARCHAR(32) NOT NULL UNIQUE,
 insurance_expiry_date DATE NOT NULL,
 inspection_expiry_date DATE NOT NULL,
 insurance_document_name VARCHAR(255) NOT NULL,
 inspection_document_name VARCHAR(255) NOT NULL,
 approval_status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
 approved_by BIGINT UNSIGNED NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (courier_id) REFERENCES users(id),
 FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types(id),
 FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 client_id BIGINT UNSIGNED NOT NULL,
 description VARCHAR(255) NOT NULL,
 category VARCHAR(80) NOT NULL,
 weight_kg DECIMAL(12,3) NOT NULL,
 volume_m3 DECIMAL(12,5) NOT NULL,
 FOREIGN KEY (client_id) REFERENCES users(id),
 CHECK (weight_kg > 0), CHECK (volume_m3 > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pricing_settings (
 id TINYINT UNSIGNED PRIMARY KEY,
 base_fee DECIMAL(10,2) NOT NULL,
 rate_per_km DECIMAL(10,4) NOT NULL,
 rate_per_kg DECIMAL(10,4) NOT NULL,
 volumetric_factor DECIMAL(10,2) NOT NULL,
 updated_by BIGINT UNSIGNED NULL,
 FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS routes (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 courier_id BIGINT UNSIGNED NOT NULL,
 vehicle_id BIGINT UNSIGNED NOT NULL,
 status ENUM('Initiated','In Progress','Completed','Cancelled') NOT NULL DEFAULT 'Initiated',
 total_distance_km DECIMAL(12,3) NULL,
 started_at DATETIME NULL,
 completed_at DATETIME NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (courier_id) REFERENCES users(id),
 FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 client_id BIGINT UNSIGNED NOT NULL,
 route_id BIGINT UNSIGNED NULL,
 origin_address VARCHAR(255) NOT NULL,
 destination_address VARCHAR(255) NOT NULL,
 origin_lat DECIMAL(10,7) NOT NULL,
 origin_lng DECIMAL(10,7) NOT NULL,
 destination_lat DECIMAL(10,7) NOT NULL,
 destination_lng DECIMAL(10,7) NOT NULL,
 distance_km DECIMAL(12,3) NOT NULL DEFAULT 0,
 declared_weight_kg DECIMAL(12,3) NOT NULL,
 actual_weight_kg DECIMAL(12,3) NULL,
 volume_m3 DECIMAL(12,5) NOT NULL,
 total_price DECIMAL(12,2) NOT NULL,
 balance_due DECIMAL(12,2) NOT NULL DEFAULT 0,
 payment_status ENUM('Unpaid','Pending','Paid','Failed') NOT NULL DEFAULT 'Unpaid',
 status ENUM('Pending','Initiated','In Progress','RTO Hold','Completed','Cancelled') NOT NULL DEFAULT 'Pending',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (client_id) REFERENCES users(id),
 FOREIGN KEY (route_id) REFERENCES routes(id),
 INDEX idx_order_dispatch (payment_status,status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_products (
 order_id BIGINT UNSIGNED NOT NULL,
 product_id BIGINT UNSIGNED NOT NULL,
 quantity INT UNSIGNED NOT NULL DEFAULT 1,
 PRIMARY KEY (order_id, product_id),
 FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
 FOREIGN KEY (product_id) REFERENCES products(id),
 CHECK (quantity > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS payments (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT UNSIGNED NOT NULL,
 gateway_reference VARCHAR(120) NULL UNIQUE,
 payment_kind ENUM('Initial','Adjustment') NOT NULL DEFAULT 'Initial',
 amount DECIMAL(12,2) NOT NULL,
 status ENUM('Pending','Succeeded','Failed') NOT NULL DEFAULT 'Pending',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS dispatch_proposals (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT UNSIGNED NOT NULL,
 courier_id BIGINT UNSIGNED NOT NULL,
 status ENUM('Pending','Accepted','Declined','Expired') NOT NULL DEFAULT 'Pending',
 expires_at DATETIME NOT NULL,
 responded_at DATETIME NULL,
 FOREIGN KEY (order_id) REFERENCES orders(id),
 FOREIGN KEY (courier_id) REFERENCES users(id),
 INDEX idx_proposal_expiry (status,expires_at)
) ENGINE=InnoDB;

-- WP4: persistent record of re-weighting and Return to Origin cases.
CREATE TABLE IF NOT EXISTS reweighting_incidents (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT UNSIGNED NOT NULL,
 reported_by BIGINT UNSIGNED NOT NULL,
 declared_weight_kg DECIMAL(12,3) NOT NULL,
 measured_weight_kg DECIMAL(12,3) NOT NULL,
 additional_fee DECIMAL(12,2) NOT NULL DEFAULT 0,
 status ENUM('Awaiting Payment','Paid','Returned','Resolved','Cancelled') NOT NULL DEFAULT 'Awaiting Payment',
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 resolved_at DATETIME NULL,
 FOREIGN KEY (order_id) REFERENCES orders(id),
 FOREIGN KEY (reported_by) REFERENCES users(id),
 INDEX idx_reweighting_order (order_id,status),
 CHECK (declared_weight_kg > 0),
 CHECK (measured_weight_kg > 0),
 CHECK (additional_fee >= 0)
) ENGINE=InnoDB;

-- Track successive pickup and drop-off waypoints for pooled routes.
CREATE TABLE IF NOT EXISTS route_stops (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 route_id BIGINT UNSIGNED NOT NULL,
 order_id BIGINT UNSIGNED NOT NULL,
 stop_sequence INT UNSIGNED NOT NULL,
 stop_type ENUM('Pickup','Dropoff') NOT NULL,
 latitude DECIMAL(10,7) NOT NULL,
 longitude DECIMAL(10,7) NOT NULL,
 arrived_at DATETIME NULL,
 FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
 FOREIGN KEY (order_id) REFERENCES orders(id),
 UNIQUE KEY uq_route_stop_sequence (route_id,stop_sequence),
 INDEX idx_route_order_stops (order_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS proof_of_delivery (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 order_id BIGINT UNSIGNED NOT NULL UNIQUE,
 courier_id BIGINT UNSIGNED NOT NULL,
 signature_path VARCHAR(255) NULL,
 verification_code_hash VARCHAR(255) NULL,
 code_verified_at DATETIME NULL,
 delivered_at DATETIME NULL,
 FOREIGN KEY (order_id) REFERENCES orders(id),
 FOREIGN KEY (courier_id) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT INTO vehicle_types (name,max_weight_kg,max_volume_m3) VALUES
 ('Bike',20,0.15),('Moto',40,0.30),('Van',1200,12),('Truck',5000,30)
 ON DUPLICATE KEY UPDATE max_weight_kg=VALUES(max_weight_kg),max_volume_m3=VALUES(max_volume_m3);
INSERT INTO pricing_settings (id,base_fee,rate_per_km,rate_per_kg,volumetric_factor)
 VALUES (1,2.50,0.40,0.30,200)
 ON DUPLICATE KEY UPDATE id=id;
