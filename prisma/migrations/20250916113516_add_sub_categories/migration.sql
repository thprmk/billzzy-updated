/*
  Warnings:

  - You are about to alter the column `lastAttemptAt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `lastNotificationAttempt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `end_date` on the `organisation` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - A unique constraint covering the columns `[name,organisation_id,parent_id]` on the table `expense_categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `expense_categories_name_organisation_id_key` ON `expense_categories`;

-- AlterTable
ALTER TABLE `active_mandates` MODIFY `lastAttemptAt` TIMESTAMP NULL,
    MODIFY `lastNotificationAttempt` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `expense_categories` ADD COLUMN `parent_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `organisation` MODIFY `end_date` DATETIME NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `expense_categories_name_organisation_id_parent_id_key` ON `expense_categories`(`name`, `organisation_id`, `parent_id`);

-- AddForeignKey
ALTER TABLE `expense_categories` ADD CONSTRAINT `expense_categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `expense_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
