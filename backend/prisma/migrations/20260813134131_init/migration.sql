-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "phoneNumber" TEXT,
    "cep" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SensorData" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sensorId" TEXT,
    "soilMoisture" REAL NOT NULL,
    "terrainInclination" REAL NOT NULL,
    "rainVolume" REAL NOT NULL,
    "groundVibration" REAL NOT NULL,
    "riskLevel" INTEGER NOT NULL,
    "statusColor" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EmergencyProtocol" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protocolCode" TEXT NOT NULL,
    "riskLevel" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Em análise',
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AlertDispatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protocolCode" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "numResidents" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AlertDispatch_protocolCode_fkey" FOREIGN KEY ("protocolCode") REFERENCES "EmergencyProtocol" ("protocolCode") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmergencyProtocol_protocolCode_key" ON "EmergencyProtocol"("protocolCode");
