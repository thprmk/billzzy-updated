/*
  Warnings:

  - You are about to alter the column `lastAttemptAt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `lastNotificationAttempt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to drop the column `use_new_variants_system` on the `organisation` table. All the data in the column will be lost.
  - You are about to alter the column `end_date` on the `organisation` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to drop the column `color` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `options` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `net_price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `productType` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `seller` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `selling_price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `_categoryvariantoptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `variant_options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `variant_values` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `_categoryvariantoptions` DROP FOREIGN KEY `_CategoryVariantOptions_A_fkey`;

-- DropForeignKey
ALTER TABLE `_categoryvariantoptions` DROP FOREIGN KEY `_CategoryVariantOptions_B_fkey`;

-- DropForeignKey
ALTER TABLE `variant_options` DROP FOREIGN KEY `variant_options_organisation_id_fkey`;

-- DropForeignKey
ALTER TABLE `variant_values` DROP FOREIGN KEY `variant_values_option_id_fkey`;

-- AlterTable
ALTER TABLE `active_mandates` MODIFY `lastAttemptAt` TIMESTAMP NULL,
    MODIFY `lastNotificationAttempt` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `organisation` DROP COLUMN `use_new_variants_system`,
    MODIFY `end_date` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `product_variants` DROP COLUMN `color`,
    DROP COLUMN `options`,
    DROP COLUMN `size`,
    ADD COLUMN `custom_attributes` JSON NULL;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `net_price`,
    DROP COLUMN `productType`,
    DROP COLUMN `seller`,
    DROP COLUMN `selling_price`,
    ADD COLUMN `net-price` DOUBLE NULL,
    ADD COLUMN `product_type_template_id` INTEGER NULL,
    ADD COLUMN `selling-price` DOUBLE NULL;

-- DropTable
DROP TABLE `_categoryvariantoptions`;

-- DropTable
DROP TABLE `variant_options`;

-- DropTable
DROP TABLE `variant_values`;

-- CreateTable
CREATE TABLE `product_type_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `organisation_id` INTEGER NOT NULL,

    UNIQUE INDEX `product_type_templates_name_organisation_id_key`(`name`, `organisation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attribute_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `template_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_product_type_template_id_fkey` FOREIGN KEY (`product_type_template_id`) REFERENCES `product_type_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_type_templates` ADD CONSTRAINT `product_type_templates_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attribute_templates` ADD CONSTRAINT `attribute_templates_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `product_type_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
