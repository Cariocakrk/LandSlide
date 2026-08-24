-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'OPERATOR',
    `phoneNumber` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NULL,
    `twoFactorCode` VARCHAR(191) NULL,
    `twoFactorExpires` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SensorData` (
    `id` VARCHAR(191) NOT NULL,
    `sensorId` VARCHAR(191) NULL,
    `soilMoisture` DOUBLE NOT NULL,
    `terrainInclination` DOUBLE NOT NULL,
    `rainVolume` DOUBLE NOT NULL,
    `groundVibration` DOUBLE NOT NULL,
    `riskLevel` INTEGER NOT NULL,
    `statusColor` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmergencyProtocol` (
    `id` VARCHAR(191) NOT NULL,
    `protocolCode` VARCHAR(191) NOT NULL,
    `riskLevel` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Em análise',
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmergencyProtocol_protocolCode_key`(`protocolCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AlertDispatch` (
    `id` VARCHAR(191) NOT NULL,
    `protocolCode` VARCHAR(191) NOT NULL,
    `cep` VARCHAR(191) NOT NULL,
    `numResidents` INTEGER NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AlertDispatch` ADD CONSTRAINT `AlertDispatch_protocolCode_fkey` FOREIGN KEY (`protocolCode`) REFERENCES `EmergencyProtocol`(`protocolCode`) ON DELETE RESTRICT ON UPDATE CASCADE;
