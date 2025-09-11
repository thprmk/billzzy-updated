/*
  Warnings:

  - You are about to alter the column `lastAttemptAt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `lastNotificationAttempt` on the `active_mandates` table. The data in that column could be lost. The data in that column will be cast from `Timestamp(0)` to `Timestamp`.
  - You are about to alter the column `end_date` on the `organisation` table. The data in that column could be lost. The data in that column will be cast from `DateTime(0)` to `DateTime`.
  - You are about to drop the column `color` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `active_mandates` MODIFY `lastAttemptAt` TIMESTAMP NULL,
    MODIFY `lastNotificationAttempt` TIMESTAMP NULL;

-- AlterTable
ALTER TABLE `organisation` ADD COLUMN `use_new_variants_system` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `end_date` DATETIME NOT NULL;

-- AlterTable
ALTER TABLE `product_variants` ADD COLUMN `options` JSON NULL;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `color`,
    DROP COLUMN `size`;

-- CreateTable
CREATE TABLE `variant_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `organisation_id` INTEGER NOT NULL,

    UNIQUE INDEX `variant_options_name_organisation_id_key`(`name`, `organisation_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `variant_values` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `value` VARCHAR(191) NOT NULL,
    `option_id` INTEGER NOT NULL,

    UNIQUE INDEX `variant_values_value_option_id_key`(`value`, `option_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CategoryVariantOptions` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CategoryVariantOptions_AB_unique`(`A`, `B`),
    INDEX `_CategoryVariantOptions_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `variant_options` ADD CONSTRAINT `variant_options_organisation_id_fkey` FOREIGN KEY (`organisation_id`) REFERENCES `organisation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `variant_values` ADD CONSTRAINT `variant_values_option_id_fkey` FOREIGN KEY (`option_id`) REFERENCES `variant_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryVariantOptions` ADD CONSTRAINT `_CategoryVariantOptions_A_fkey` FOREIGN KEY (`A`) REFERENCES `product_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryVariantOptions` ADD CONSTRAINT `_CategoryVariantOptions_B_fkey` FOREIGN KEY (`B`) REFERENCES `variant_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
