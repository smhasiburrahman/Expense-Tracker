-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Sep 25, 2026 at 12:14 PM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.4

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `hisabnikash`
--

-- --------------------------------------------------------

--
-- Table structure for table `budget_categories`
--

CREATE TABLE `budget_categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `color_hex` varchar(7) DEFAULT NULL,
  `monthly_budget_cap` decimal(19,4) DEFAULT NULL,
  `limit_type` enum('SOFT','HARD') NOT NULL DEFAULT 'SOFT',
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `currencies`
--

CREATE TABLE `currencies` (
  `currency_code` char(3) NOT NULL,
  `currency_name` varchar(50) NOT NULL,
  `symbol` varchar(5) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `default_category_templates`
--

CREATE TABLE `default_category_templates` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `color_hex` varchar(7) DEFAULT NULL,
  `sort_order` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `recurring_transactions`
--

CREATE TABLE `recurring_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `wallet_id` bigint(20) UNSIGNED NOT NULL,
  `category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `amount` decimal(19,4) NOT NULL,
  `frequency` enum('DAILY','WEEKLY','MONTHLY','YEARLY') NOT NULL,
  `next_charge_date` date NOT NULL,
  `status` enum('ACTIVE','PAUSED') NOT NULL DEFAULT 'ACTIVE',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `savings_vaults`
--

CREATE TABLE `savings_vaults` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `emoji` varchar(10) DEFAULT NULL,
  `color_hex` varchar(7) DEFAULT NULL,
  `target_amount` decimal(19,4) NOT NULL,
  `initial_savings` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `target_date` date DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `transactions`
--

CREATE TABLE `transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `wallet_id` bigint(20) UNSIGNED NOT NULL,
  `category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `vault_id` bigint(20) UNSIGNED DEFAULT NULL,
  `recurring_transaction_id` bigint(20) UNSIGNED DEFAULT NULL,
  `transaction_type` enum('EXPENSE','VAULT_CONTRIBUTION','SADAQA_CONTRIBUTION') NOT NULL,
  `entry_method` enum('MANUAL','AI_QUICK_ADD','RECEIPT_OCR','SYSTEM_RECURRING') NOT NULL DEFAULT 'MANUAL',
  `description` varchar(255) DEFAULT NULL,
  `source_note` varchar(500) DEFAULT NULL,
  `original_amount` decimal(19,4) NOT NULL,
  `original_currency_code` char(3) NOT NULL,
  `exchange_rate` decimal(19,6) NOT NULL DEFAULT 1.000000,
  `exchange_rate_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `converted_amount` decimal(19,4) NOT NULL,
  `transaction_date` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `full_name` varchar(150) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `base_currency_code` char(3) NOT NULL,
  `monthly_income` decimal(19,4) DEFAULT NULL,
  `sadaqa_monthly_target` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `region` varchar(100) DEFAULT NULL,
  `notify_budget_alerts` tinyint(1) NOT NULL DEFAULT 1,
  `notify_periodic_summary` tinyint(1) NOT NULL DEFAULT 1,
  `notify_savings_goals` tinyint(1) NOT NULL DEFAULT 1,
  `onboarding_completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ;

-- --------------------------------------------------------

--
-- Table structure for table `wallets`
--

CREATE TABLE `wallets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `icon` varchar(50) DEFAULT NULL,
  `color_hex` varchar(7) DEFAULT NULL,
  `currency_code` char(3) NOT NULL,
  `opening_balance` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `current_balance` decimal(19,4) NOT NULL DEFAULT 0.0000,
  `is_archived` tinyint(1) NOT NULL DEFAULT 0,
  `version` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `budget_categories`
--
ALTER TABLE `budget_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_categories_user_archived` (`user_id`,`is_archived`);

--
-- Indexes for table `currencies`
--
ALTER TABLE `currencies`
  ADD PRIMARY KEY (`currency_code`);

--
-- Indexes for table `default_category_templates`
--
ALTER TABLE `default_category_templates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_default_category_name` (`name`);

--
-- Indexes for table `recurring_transactions`
--
ALTER TABLE `recurring_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_recurring_wallet` (`wallet_id`),
  ADD KEY `fk_recurring_category` (`category_id`),
  ADD KEY `idx_recurring_due` (`status`,`next_charge_date`),
  ADD KEY `idx_recurring_user_due` (`user_id`,`status`,`next_charge_date`);

--
-- Indexes for table `savings_vaults`
--
ALTER TABLE `savings_vaults`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_vaults_user_deleted` (`user_id`,`deleted_at`);

--
-- Indexes for table `transactions`
--
ALTER TABLE `transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_txn_category` (`category_id`),
  ADD KEY `fk_txn_currency` (`original_currency_code`),
  ADD KEY `idx_txn_user_date` (`user_id`,`transaction_date`),
  ADD KEY `idx_txn_user_category` (`user_id`,`category_id`),
  ADD KEY `idx_txn_user_wallet` (`user_id`,`wallet_id`),
  ADD KEY `idx_txn_user_date_category` (`user_id`,`transaction_date`,`category_id`),
  ADD KEY `idx_txn_wallet_date` (`wallet_id`,`transaction_date`),
  ADD KEY `idx_txn_vault` (`vault_id`,`transaction_date`),
  ADD KEY `idx_txn_user_type` (`user_id`,`transaction_type`),
  ADD KEY `idx_txn_recurring` (`recurring_transaction_id`);
ALTER TABLE `transactions` ADD FULLTEXT KEY `ftx_txn_description` (`description`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD KEY `fk_users_currency` (`base_currency_code`);

--
-- Indexes for table `wallets`
--
ALTER TABLE `wallets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_wallets_currency` (`currency_code`),
  ADD KEY `idx_wallets_user_archived` (`user_id`,`is_archived`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `budget_categories`
--
ALTER TABLE `budget_categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `default_category_templates`
--
ALTER TABLE `default_category_templates`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `recurring_transactions`
--
ALTER TABLE `recurring_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `savings_vaults`
--
ALTER TABLE `savings_vaults`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `transactions`
--
ALTER TABLE `transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `wallets`
--
ALTER TABLE `wallets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `budget_categories`
--
ALTER TABLE `budget_categories`
  ADD CONSTRAINT `fk_categories_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `recurring_transactions`
--
ALTER TABLE `recurring_transactions`
  ADD CONSTRAINT `fk_recurring_category` FOREIGN KEY (`category_id`) REFERENCES `budget_categories` (`id`),
  ADD CONSTRAINT `fk_recurring_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_recurring_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`);

--
-- Constraints for table `savings_vaults`
--
ALTER TABLE `savings_vaults`
  ADD CONSTRAINT `fk_vaults_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `fk_txn_category` FOREIGN KEY (`category_id`) REFERENCES `budget_categories` (`id`),
  ADD CONSTRAINT `fk_txn_currency` FOREIGN KEY (`original_currency_code`) REFERENCES `currencies` (`currency_code`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_txn_recurring` FOREIGN KEY (`recurring_transaction_id`) REFERENCES `recurring_transactions` (`id`),
  ADD CONSTRAINT `fk_txn_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_txn_vault` FOREIGN KEY (`vault_id`) REFERENCES `savings_vaults` (`id`),
  ADD CONSTRAINT `fk_txn_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallets` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_currency` FOREIGN KEY (`base_currency_code`) REFERENCES `currencies` (`currency_code`) ON UPDATE CASCADE;

--
-- Constraints for table `wallets`
--
ALTER TABLE `wallets`
  ADD CONSTRAINT `fk_wallets_currency` FOREIGN KEY (`currency_code`) REFERENCES `currencies` (`currency_code`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_wallets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
