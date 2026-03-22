-- POS Config tablosu
CREATE TABLE IF NOT EXISTS `pos_configs` (
  `id`           INT NOT NULL AUTO_INCREMENT,
  `restaurantId` INT NOT NULL,
  `isActive`     TINYINT(1) NOT NULL DEFAULT 0,
  `testMode`     TINYINT(1) NOT NULL DEFAULT 1,
  `clientId`     VARCHAR(100) NOT NULL DEFAULT '',
  `storeKey`     VARCHAR(255) NOT NULL DEFAULT '',
  `gatewayUrl`   VARCHAR(500) NOT NULL DEFAULT '',
  `apiUrl`       VARCHAR(500) NOT NULL DEFAULT '',
  `apiUser`      VARCHAR(100) NOT NULL DEFAULT '',
  `apiPass`      VARCHAR(255) NOT NULL DEFAULT '',
  `storeType`    VARCHAR(50) NOT NULL DEFAULT '3d',
  `createdAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `pos_configs_restaurantId_key` (`restaurantId`),
  CONSTRAINT `pos_configs_restaurantId_fkey`
    FOREIGN KEY (`restaurantId`) REFERENCES `restaurants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order tablosuna ödeme alanları ekle
ALTER TABLE `orders`
  ADD COLUMN IF NOT EXISTS `paymentMethod` VARCHAR(20) NOT NULL DEFAULT 'cash' AFTER `totalAmount`,
  ADD COLUMN IF NOT EXISTS `paymentStatus` VARCHAR(20) NOT NULL DEFAULT 'pending' AFTER `paymentMethod`,
  ADD COLUMN IF NOT EXISTS `posOrderId`    VARCHAR(100) NULL AFTER `paymentStatus`,
  ADD COLUMN IF NOT EXISTS `posAuthCode`   VARCHAR(100) NULL AFTER `posOrderId`;
