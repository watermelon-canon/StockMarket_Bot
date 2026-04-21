import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const adapter = new PrismaBetterSqlite3({ url: `file:${path.resolve('./dev.db')}` } as any);
const prisma = new PrismaClient({ adapter });

async function seed() {
  const users = await prisma.user.findMany();
  if (users.length === 0) return;

  for (const user of users) {
    await prisma.trade.deleteMany({ where: { userId: user.id } });

    const tickers = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMD'];
    const trades = [];
    const now = Date.now();
    const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;
    
    // Create 60 trades
    for (let i = 0; i < 60; i++) {
      const isWin = Math.random() > 0.4; 
      const pnl = isWin ? Math.random() * 15000 + 5000 : -(Math.random() * 8000 + 2000); 
      const entryTime = new Date(threeMonthsAgo + (i * 1.5 * 24 * 60 * 60 * 1000));
      const exitTime = new Date(entryTime.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000);
      
      trades.push({
        userId: user.id,
        ticker: tickers[Math.floor(Math.random() * tickers.length)],
        side: 'BUY',
        qty: Math.floor(Math.random() * 100) + 20,
        entryPrice: Math.random() * 150 + 100,
        status: 'CLOSED',
        entryTime,
        exitTime,
        exitReason: 'AUTO_TAKE_PROFIT',
        grossPnl: pnl,
        netPnl: pnl - 2,
      });
    }

    const targetProfit = 273561;
    const currentTotal = trades.reduce((sum, t) => sum + t.grossPnl, 0);
    const diff = targetProfit - currentTotal;
    trades[trades.length - 1].grossPnl += diff;
    trades[trades.length - 1].netPnl += diff;

    trades.sort((a, b) => a.entryTime.getTime() - b.entryTime.getTime());

    await prisma.trade.createMany({ data: trades });

    await prisma.trade.create({
      data: {
        userId: user.id,
        ticker: 'GOOGL',
        side: 'BUY',
        qty: 15,
        entryPrice: 150.25,
        status: 'FILLED',
        entryTime: new Date(now - 2 * 24 * 60 * 60 * 1000)
      }
    });
  }
}

seed().catch(console.error).finally(() => prisma.$disconnect());
