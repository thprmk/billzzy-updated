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
CREATE TABLE `Gowhats` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organisationId` INTEGER NOT NULL,
    `whatsappNumber` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NOT NULL,
    `businessId` VARCHAR(191) NOT NULL,
    `phoneNumberId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Gowhats_organisationId_key`(`organisationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Gowhats` ADD CONSTRAINT `Gowhats_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
