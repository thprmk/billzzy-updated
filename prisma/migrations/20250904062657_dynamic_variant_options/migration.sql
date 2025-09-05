/*
  Warnings:

  - You are about to alter the column `lastAttemptAt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `lastNotificationAttempt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `end_date` on the `organisation` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to drop the column `color` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `color` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `active_mandates` MODIFY `lastAttemptAt` TIMESTAMP NULL,
    MODIFY `lastNotificationAttempt` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `organisation` MODIFY `end_date` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `product_categories` ADD COLUMN `option1_name` VARCHAR(191) NULL,
    ADD COLUMN `option2_name` VARCHAR(191) NULL,
    ADD COLUMN `option3_name` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product_variants` DROP COLUMN `color`,
    DROP COLUMN `size`,
    ADD COLUMN `option1_value` VARCHAR(191) NULL,
    ADD COLUMN `option2_value` VARCHAR(191) NULL,
    ADD COLUMN `option3_value` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `color`,
    DROP COLUMN `size`;
