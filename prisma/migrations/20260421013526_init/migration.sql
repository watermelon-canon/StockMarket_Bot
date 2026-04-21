-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "alpacaKey" TEXT,
    "alpacaSecret" TEXT,
    "maxEquity" REAL NOT NULL DEFAULT 5000,
    "stopLossMargin" REAL NOT NULL DEFAULT 0.01,
    "takeProfitMargin" REAL NOT NULL DEFAULT 0.01,
    "maxPositions" INTEGER NOT NULL DEFAULT 3,
    "maxDailyLoss" REAL NOT NULL DEFAULT 0.05,
    "maxTradesDay" INTEGER NOT NULL DEFAULT 10,
    "autoModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "watchlist" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "entryPrice" REAL NOT NULL,
    "exitPrice" REAL,
    "qty" INTEGER NOT NULL,
    "grossPnl" REAL,
    "netPnl" REAL,
    "exitReason" TEXT,
    "orderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "entryTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exitTime" DATETIME,
    CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SignalLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "compositeScore" INTEGER NOT NULL,
    "technicalScore" INTEGER NOT NULL,
    "fundamentalScore" INTEGER NOT NULL,
    "signalType" TEXT NOT NULL,
    "stage1Pass" BOOLEAN NOT NULL DEFAULT false,
    "stage2Pass" BOOLEAN NOT NULL DEFAULT false,
    "stage3Pass" BOOLEAN NOT NULL DEFAULT false,
    "stage4Pass" BOOLEAN NOT NULL DEFAULT false,
    "rsiValue" REAL,
    "emaTrend" TEXT,
    "stochasticSignal" TEXT,
    "actionTaken" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignalLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "targetPrice" REAL NOT NULL,
    "triggered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
