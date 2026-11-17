-- Banco do site l2ikarus.com (MariaDB na VPS nova do L2 Ikarus). Comeca do zero (11/2026).
-- Tudo IF NOT EXISTS: seguro rodar de novo. Importado pelo vps_windows/instalar_banco_site.ps1.
-- Fonte: site/vps/schema-all.sql + programa_indicacao.sql (sem as tabelas do L2 antigo).

CREATE TABLE IF NOT EXISTS `accounts` (
  `login` VARCHAR(45) NOT NULL,
  `password` VARCHAR(160) NOT NULL COMMENT 'scrypt$sal$hash',
  `email` VARCHAR(120) DEFAULT NULL,
  `access_level` INT NOT NULL DEFAULT 0,
  `created_time` BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`login`),
  UNIQUE KEY `uk_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ikoin_balance` (
  `account_name` VARCHAR(45) NOT NULL,
  `balance` INT NOT NULL DEFAULT 0,
  `updated_at` BIGINT DEFAULT NULL,
  PRIMARY KEY (`account_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ikoin_transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `account_name` VARCHAR(45) NOT NULL,
  `amount` INT NOT NULL,
  `type` VARCHAR(30) NOT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `reference` VARCHAR(100) DEFAULT NULL,
  `created_at` BIGINT DEFAULT NULL,
  INDEX `idx_account` (`account_name`),
  INDEX `idx_reference` (`reference`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ikoin_orders` (
  `id` VARCHAR(64) NOT NULL,
  `account_name` VARCHAR(45) NOT NULL,
  `amount` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `mp_payment_id` VARCHAR(100) DEFAULT NULL,
  `created_at` BIGINT DEFAULT NULL,
  `paid_at` BIGINT DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_mp` (`mp_payment_id`),
  INDEX `idx_acc` (`account_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `promo_codes` (
  `code` VARCHAR(50) NOT NULL,
  `items` TEXT DEFAULT NULL,
  `ikoin` INT NOT NULL DEFAULT 0,
  `description` VARCHAR(255) DEFAULT NULL,
  `active` TINYINT NOT NULL DEFAULT 1,
  `max_uses` INT NOT NULL DEFAULT 0,
  `uses` INT NOT NULL DEFAULT 0,
  `created_by` VARCHAR(100) DEFAULT NULL,
  `created_at` INT DEFAULT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `promo_ikoin_redeemed` (
  `code` VARCHAR(50) NOT NULL,
  `account_name` VARCHAR(45) NOT NULL,
  `redeemed_at` BIGINT DEFAULT NULL,
  PRIMARY KEY (`code`, `account_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `promo_redeemed` (
  `code` VARCHAR(50) NOT NULL,
  `account_name` VARCHAR(45) NOT NULL,
  `redeemed_at` BIGINT DEFAULT NULL,
  PRIMARY KEY (`code`, `account_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `streamers` (
  `slug` VARCHAR(45) NOT NULL,
  `name` VARCHAR(100) DEFAULT NULL,
  `commission_pct` INT NOT NULL DEFAULT 10,
  `active` TINYINT NOT NULL DEFAULT 1,
  `payout_info` VARCHAR(255) DEFAULT NULL,
  `account_name` VARCHAR(45) DEFAULT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'approved',
  `applied_at` BIGINT DEFAULT NULL,
  `reviewed_at` BIGINT DEFAULT NULL,
  `reject_reason` VARCHAR(255) DEFAULT NULL,
  `created_at` BIGINT DEFAULT NULL,
  PRIMARY KEY (`slug`),
  INDEX `idx_account` (`account_name`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `account_referrals` (
  `account_name` VARCHAR(45) NOT NULL,
  `streamer_slug` VARCHAR(45) NOT NULL,
  `created_at` BIGINT DEFAULT NULL,
  PRIMARY KEY (`account_name`),
  INDEX `idx_streamer` (`streamer_slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `referral_commissions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `order_id` VARCHAR(64) NOT NULL COMMENT 'ikoin_orders.id - 1 comissao por pedido',
  `streamer_slug` VARCHAR(45) NOT NULL,
  `buyer_account` VARCHAR(45) NOT NULL,
  `order_amount` INT NOT NULL COMMENT 'valor da compra (1 Ikoin = R$ 1,00)',
  `commission_pct` INT NOT NULL COMMENT 'percentual congelado no momento da compra',
  `commission_value` DECIMAL(10,2) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT 'pending|available|paid|reversed',
  `created_at` BIGINT NOT NULL COMMENT 'quando a compra foi paga',
  `available_at` BIGINT NOT NULL COMMENT 'created_at + 30 dias - quando vira sacavel',
  `paid_at` BIGINT DEFAULT NULL,
  `payout_id` BIGINT DEFAULT NULL COMMENT 'referral_payouts.id quando sacado',
  `reversed_at` BIGINT DEFAULT NULL,
  `reverse_reason` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_order` (`order_id`),
  INDEX `idx_slug_status` (`streamer_slug`, `status`),
  INDEX `idx_available` (`available_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `referral_payouts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `streamer_slug` VARCHAR(45) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'requested' COMMENT 'requested|processing|paid|rejected',
  `pix_key` VARCHAR(255) DEFAULT NULL COMMENT 'coletado so na hora do saque (LGPD: principio da necessidade)',
  `requested_at` BIGINT NOT NULL,
  `processed_at` BIGINT DEFAULT NULL,
  `note` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_slug` (`streamer_slug`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS site_settings (
  k VARCHAR(64) NOT NULL PRIMARY KEY,
  v TEXT NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT 0,
  updated_by VARCHAR(120) NULL
);

CREATE TABLE IF NOT EXISTS site_galeria (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  url_card VARCHAR(500) NOT NULL,
  url_full VARCHAR(500) NOT NULL,
  legenda VARCHAR(140) NOT NULL DEFAULT '',
  ordem INT NOT NULL DEFAULT 0,
  visivel TINYINT NOT NULL DEFAULT 1,
  criado_em BIGINT NOT NULL DEFAULT 0,
  criado_por VARCHAR(120) NULL
);
