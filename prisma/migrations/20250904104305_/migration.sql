/*
  Warnings:

  - You are about to alter the column `lastAttemptAt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `lastNotificationAttempt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `end_date` on the `organisation` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to drop the column `option1_name` on the `product_categories` table. All the data in the column will be lost.
  - You are about to drop the column `option2_name` on the `product_categories` table. All the data in the column will be lost.
  - You are about to drop the column `option3_name` on the `product_categories` table. All the data in the column will be lost.
  - You are about to drop the column `option1_value` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `option2_value` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `option3_value` on the `product_variants` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `active_mandates` MODIFY `lastAttemptAt` TIMESTAMP NULL,
    MODIFY `lastNotificationAttempt` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `organisation` MODIFY `end_date` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `product_categories` DROP COLUMN `option1_name`,
    DROP COLUMN `option2_name`,
    DROP COLUMN `option3_name`;

-- AlterTable
ALTER TABLE `product_variants` DROP COLUMN `option1_value`,
    DROP COLUMN `option2_value`,
    DROP COLUMN `option3_value`,
    ADD COLUMN `color` VARCHAR(191) NULL,
    ADD COLUMN `size` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `color` VARCHAR(191) NULL,
    ADD COLUMN `size` VARCHAR(191) NULL;
