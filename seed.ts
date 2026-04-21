import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const adapter = new PrismaBetterSqlite3({ url: `file:${path.resolve('./dev.db')}` } as any);
const prisma = new PrismaClient({ adapter });

async function seed() {
  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log('No users found to seed.');
    return;
  }

  for (const user of users) {
    await prisma.trade.deleteMany({ where: { userId: user.id } });

    const tickers = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMD'];
    const trades = [];
    const now = Date.now();
    const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < 30; i++) {
      const isWin = Math.random() > 0.3; 
      const pnl = isWin ? Math.random() * 20000 + 10000 : -(Math.random() * 10000 + 5000); 
      const entryTime = new Date(threeMonthsAgo + (i * 3 * 24 * 60 * 60 * 1000)); // Spread evenly
      const exitTime = new Date(entryTime.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000);
      
      trades.push({
        userId: user.id,
        ticker: tickers[Math.floor(Math.random() * tickers.length)],
        side: 'BUY',
        qty: Math.floor(Math.random() * 50) + 10,
        entryPrice: Math.random() * 200 + 100,
        status: 'CLOSED',
        entryTime,
        exitTime,
        exitReason: 'AUTO_TAKE_PROFIT',
        grossPnl: pnl,
        netPnl: pnl - 2,
      });
    }

    const currentTotal = trades.reduce((sum, t) => sum + t.grossPnl, 0);
    const diff = 250000 - currentTotal;
    trades[trades.length - 1].grossPnl += diff;
    trades[trades.length - 1].netPnl += diff;

    // Make sure they are chronologically sorted for the graph
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

    console.log(`Seeded trades for ${user.email}`);
  }
}

seed().catch(console.error).finally(() => prisma.$disconnect());
