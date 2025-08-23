/*
  Warnings:

  - You are about to alter the column `lastAttemptAt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `lastNotificationAttempt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `end_date` on the `organisation` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.

*/
-- AlterTable
ALTER TABLE `active_mandates` MODIFY `lastAttemptAt` TIMESTAMP NULL,
    MODIFY `lastNotificationAttempt` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `organisation` MODIFY `end_date` DATETIME NOT NULL;

-- CreateTable
CREATE TABLE `invoices` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(191) NOT NULL,
    `issueDate` DATE NOT NULL,
    `dueDate` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `notes` TEXT NULL,
    `sub_total` DOUBLE NOT NULL,
    `total_tax` DOUBLE NOT NULL,
    `total_amount` DOUBLE NOT NULL,
    `customer_id` INTEGER NULL,
    `organisation_id` INTEGER NOT NULL,
    `created_transaction_id` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invoices_created_transaction_id_key`(`created_transaction_id`),
    UNIQUE INDEX `invoices_organisation_id_invoice_number_key`(`organisation_id`, `invoice_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit_price` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `product_id` INTEGER NULL,
    `invoice_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_items` ADD CONSTRAINT `invoice_items_invoice_id_fkey` FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
