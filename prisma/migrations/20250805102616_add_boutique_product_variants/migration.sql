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

-- AlterTable
ALTER TABLE `products` ADD COLUMN `productType` ENUM('STANDARD', 'BOUTIQUE') NOT NULL DEFAULT 'STANDARD',
    MODIFY `SKU` VARCHAR(191) NULL,
    MODIFY `net_price` DOUBLE NULL,
    MODIFY `selling_price` DOUBLE NULL,
    MODIFY `quantity` INTEGER NULL;

-- AlterTable
ALTER TABLE `transaction_items` ADD COLUMN `product_variant_id` INTEGER NULL,
    MODIFY `product_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `product_variants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `SKU` VARCHAR(191) NOT NULL,
    `net_price` DOUBLE NOT NULL,
    `selling_price` DOUBLE NOT NULL,
    `quantity` INTEGER NOT NULL,
    `size` VARCHAR(191) NULL,
    `color` VARCHAR(191) NULL,
    `product_id` INTEGER NOT NULL,

    UNIQUE INDEX `product_variants_SKU_key`(`SKU`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transaction_items` ADD CONSTRAINT `transaction_items_product_variant_id_fkey` FOREIGN KEY (`product_variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
