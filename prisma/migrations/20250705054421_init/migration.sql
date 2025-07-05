-- CreateTable
CREATE TABLE `organisation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `password` VARCHAR(191) NOT NULL,
    `reset_token` VARCHAR(191) NULL,
    `reset_token_expiry` DATETIME(3) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `company_size` VARCHAR(191) NOT NULL,
    `shop_name` VARCHAR(191) NOT NULL,
    `flatno` VARCHAR(191) NOT NULL,
    `street` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NOT NULL,
    `sms_count` INTEGER NOT NULL DEFAULT 0,
    `sms_cost` DOUBLE NOT NULL DEFAULT 0,
    `country` VARCHAR(191) NOT NULL,
    `pincode` VARCHAR(191) NOT NULL,
    `mobile_number` VARCHAR(191) NOT NULL,
    `landline_number` VARCHAR(191) NULL,
    `website_address` VARCHAR(191) NULL,
    `gst_number` VARCHAR(191) NULL,
    `subscription_type` VARCHAR(191) NOT NULL,
    `end_date` DATETIME NOT NULL,
    `whatsapp_number` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `razorpay_access_token` TEXT NULL,
    `razorpay_refresh_token` TEXT NULL,
    `razorpay_token_expires_at` DATETIME(3) NULL,
    `razorpay_account_id` VARCHAR(191) NULL,
    `razorpay_state` VARCHAR(191) NULL,
    `razorpay_state_expires_at` DATETIME(3) NULL,
    `monthlyUsage` INTEGER NOT NULL DEFAULT 0,
    `shopify_token` VARCHAR(191) NULL,
    `shopify_domain` VARCHAR(191) NULL,
    `bill_counter` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `organisation_email_key`(`email`),
    INDEX `organisation_reset_token_idx`(`reset_token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomerSubmission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(191) NOT NULL,
    `organisationId` INTEGER NOT NULL,
    `customerId` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomerSubmission_token_key`(`token`),
    INDEX `CustomerSubmission_organisationId_idx`(`organisationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `organisation_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `SKU` VARCHAR(191) NOT NULL,
    `net_price` DOUBLE NOT NULL,
    `selling_price` DOUBLE NOT NULL,
    `quantity` INTEGER NOT NULL,
    `seller` VARCHAR(191) NOT NULL,
    `organisation_id` INTEGER NOT NULL,
    `category_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sellers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `organisation_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_record` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bill_no` INTEGER NOT NULL,
    `total_price` DOUBLE NOT NULL,
    `payment_method` VARCHAR(191) NOT NULL,
    `amount_paid` DOUBLE NOT NULL DEFAULT 0,
    `balance` DOUBLE NOT NULL DEFAULT 0,
    `billing_mode` VARCHAR(191) NOT NULL,
    `organisation_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `company_bill_no` INTEGER NULL,
    `time` TIME NOT NULL,
    `tracking_number` VARCHAR(191) NULL,
    `weight` DOUBLE NULL,
    `customer_id` INTEGER NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'confirmed',
    `notes` TEXT NULL,
    `payment_id` VARCHAR(191) NULL,
    `payment_status` ENUM('PENDING', 'PAID', 'FAILED', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `isEdited` BOOLEAN NOT NULL DEFAULT false,
    `gst_amount` DOUBLE NULL,
    `gst_percent` DOUBLE NULL,
    `shippingCost` DOUBLE NULL,
    `shippingMethodId` INTEGER NULL,
    `taxAmount` DOUBLE NULL,

    UNIQUE INDEX `transaction_record_bill_no_key`(`bill_no`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaction_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `total_price` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `district` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `pincode` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `flat_no` VARCHAR(191) NULL,
    `street` VARCHAR(191) NULL,
    `organisation_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `category_id` INTEGER NULL,
    `organisation_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,

    UNIQUE INDEX `inventory_product_id_organisation_id_key`(`product_id`, `organisation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscription_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organisation_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `month` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `sms_count` INTEGER NOT NULL,
    `shop_name` VARCHAR(191) NOT NULL,
    `mobile_number` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `shipping_methods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('FREE_SHIPPING', 'COURIER_PARTNER', 'CUSTOM_SHIPPING') NOT NULL,
    `min_amount` DOUBLE NULL,
    `use_weight` BOOLEAN NOT NULL DEFAULT false,
    `rate_per_kg` DOUBLE NULL,
    `fixed_rate` DOUBLE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `organisation_id` INTEGER NOT NULL,
    `customRate` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transaction_shipping` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transaction_id` INTEGER NOT NULL,
    `method_name` VARCHAR(191) NOT NULL,
    `method_type` ENUM('FREE_SHIPPING', 'COURIER_PARTNER', 'CUSTOM_SHIPPING') NOT NULL,
    `base_rate` DOUBLE NULL,
    `weight_charge` DOUBLE NULL,
    `total_weight` DOUBLE NULL,
    `total_cost` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mandates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organisationId` INTEGER NOT NULL,
    `merchantTranId` VARCHAR(191) NOT NULL,
    `bankRRN` VARCHAR(191) NULL,
    `UMN` VARCHAR(191) NULL,
    `amount` DOUBLE NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `payerVA` VARCHAR(191) NOT NULL,
    `payerName` VARCHAR(191) NULL,
    `payerMobile` VARCHAR(191) NULL,
    `txnInitDate` DATETIME(3) NULL,
    `txnCompletionDate` DATETIME(3) NULL,
    `responseCode` VARCHAR(191) NULL,
    `respCodeDescription` VARCHAR(191) NULL,

    UNIQUE INDEX `mandates_merchantTranId_key`(`merchantTranId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `active_mandates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organisationId` INTEGER NOT NULL,
    `UMN` VARCHAR(191) NULL,
    `mandateSeqNo` INTEGER NOT NULL DEFAULT 1,
    `amount` DOUBLE NOT NULL,
    `notificationRetries` INTEGER NOT NULL DEFAULT 0,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'INACTIVE',
    `payerVA` VARCHAR(191) NOT NULL,
    `payerName` VARCHAR(191) NULL,
    `payerMobile` VARCHAR(191) NULL,
    `notified` BOOLEAN NOT NULL DEFAULT false,
    `lastAttemptAt` TIMESTAMP NULL,
    `lastNotificationAttempt` TIMESTAMP NULL,

    UNIQUE INDEX `active_mandates_organisationId_key`(`organisationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mandate_notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organisationId` INTEGER NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mandate_notifications_organisationId_idx`(`organisationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `custom_shippings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `price` DOUBLE NOT NULL,
    `name` VARCHAR(191) NULL,
    `organisationId` INTEGER NOT NULL,

    INDEX `custom_shippings_organisationId_idx`(`organisationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organisationId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `value` DOUBLE NOT NULL,
    `autoApply` BOOLEAN NOT NULL,

    INDEX `tax_organisationId_idx`(`organisationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomerSubmission` ADD CONSTRAINT `CustomerSubmission_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerSubmission` ADD CONSTRAINT `CustomerSubmission_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sellers` ADD CONSTRAINT `sellers_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_record` ADD CONSTRAINT `transaction_record_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_record` ADD CONSTRAINT `transaction_record_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_items` ADD CONSTRAINT `transaction_items_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `transaction_record`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_items` ADD CONSTRAINT `transaction_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `product_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory` ADD CONSTRAINT `inventory_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `shipping_methods` ADD CONSTRAINT `shipping_methods_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_shipping` ADD CONSTRAINT `transaction_shipping_transaction_id_fkey` FOREIGN KEY (`transaction_id`) REFERENCES `transaction_record`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mandates` ADD CONSTRAINT `mandates_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `active_mandates` ADD CONSTRAINT `active_mandates_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mandate_notifications` ADD CONSTRAINT `mandate_notifications_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_shippings` ADD CONSTRAINT `custom_shippings_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tax` ADD CONSTRAINT `tax_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
