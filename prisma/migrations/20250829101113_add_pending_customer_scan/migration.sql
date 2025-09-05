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
CREATE TABLE `whatsapptracker` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `transactionId` INTEGER NOT NULL,
    `templateType` VARCHAR(191) NOT NULL,
    `phoneNumber` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `WhatsAppTracker_transactionId_idx`(`transactionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PendingCustomerScan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `organisationId` INTEGER NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PendingCustomerScan_organisationId_idx`(`organisationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PendingCustomerScan` ADD CONSTRAINT `PendingCustomerScan_organisationId_fkey` FOREIGN KEY (`organisationId`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
