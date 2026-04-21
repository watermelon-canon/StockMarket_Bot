import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import YahooFinance from 'yahoo-finance2';
import { EMA, RSI, Stochastic, MACD, BollingerBands, SMA } from 'technicalindicators';

const adapter = new PrismaBetterSqlite3({ url: `file:${path.resolve('./dev.db')}` });
const prisma = new PrismaClient({ adapter });
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  app.use(express.json());
  app.use(cookieParser());

  // --- Auth Middleware ---
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.create({ data: { name, email, passwordHash, settings: { create: {} } } });
      res.json({ message: 'User created' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true }).json({ id: user.id, name: user.name, email: user.email });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('token').json({ message: 'Logged out' });
  });

  app.get('/api/auth/me', authenticate, async (req: any, res: any) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { settings: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, name: user.name, email: user.email, settings: user.settings });
  });

  app.put('/api/user/settings', authenticate, async (req: any, res) => {
    try {
      const data = req.body;
      const settings = await prisma.userSettings.upsert({
        where: { userId: req.user.id },
        update: data,
        create: { userId: req.user.id, ...data }
      });
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Signal Engine ---
  async function computeSignal(ticker: string) {
    try {
      const quote: any = await yf.quote(ticker);
      const now = new Date();

      const [chart30m, chart5m] = await Promise.all([
        yf.chart(ticker, { period1: new Date(now.getTime() - 5 * 24 * 3600000), period2: now, interval: '30m' }),
        yf.chart(ticker, { period1: new Date(now.getTime() - 2 * 24 * 3600000), period2: now, interval: '5m' }),
      ]);

      const q30 = chart30m.quotes || [];
      const q5 = chart5m.quotes || [];
      if (q30.length < 50 || q5.length < 50) throw new Error('Insufficient candle data');

      const closes30 = q30.map((c: any) => c.close).filter(Boolean);
      const closes5 = q5.map((c: any) => c.close).filter(Boolean);
      const highs5 = q5.map((c: any) => c.high).filter(Boolean);
      const lows5 = q5.map((c: any) => c.low).filter(Boolean);
      const vols5 = q5.map((c: any) => c.volume).filter(Boolean);

      let techScore = 0;
      const reasons: string[] = [];

      // Stage 1: EMA trend 30m
      const e30_9 = EMA.calculate({ period: 9, values: closes30 });
      const e30_26 = EMA.calculate({ period: 26, values: closes30 });
      const e30_50 = EMA.calculate({ period: 50, values: closes30 });
      const stage1 = e30_9.at(-1)! > e30_26.at(-1)! && e30_26.at(-1)! > e30_50.at(-1)!;
      if (stage1) { techScore += 25; reasons.push('EMA bullish stack confirmed on 30-min timeframe'); }

      // Stage 2: EMA trend 5m aligned
      const e5_9 = EMA.calculate({ period: 9, values: closes5 });
      const e5_26 = EMA.calculate({ period: 26, values: closes5 });
      const e5_50 = EMA.calculate({ period: 50, values: closes5 });
      const stage2 = e5_9.at(-1)! > e5_26.at(-1)! && e5_26.at(-1)! > e5_50.at(-1)!;
      if (stage1 && stage2) { techScore += 20; reasons.push('EMA alignment confirmed on 5-min — strong trend'); }

      // Stage 3: RSI
      const rsiArr = RSI.calculate({ period: 14, values: closes5 });
      const rsiVal = rsiArr.at(-1) || 50;
      const stage3 = rsiVal > 50 && rsiVal < 80;
      if (stage3) { techScore += 15; reasons.push(`RSI at ${rsiVal.toFixed(1)} — bullish momentum without overbought risk`); }

      // Stage 4: Stochastic
      const stoch = Stochastic.calculate({ high: highs5, low: lows5, close: closes5, period: 9, signalPeriod: 6 });
      const lastStoch = stoch.at(-1);
      const stage4 = lastStoch ? lastStoch.k > lastStoch.d && lastStoch.k < 80 : false;
      if (stage4) { techScore += 20; reasons.push(`Stochastic K crossed above D — clean entry signal`); }

      // Bonus: MACD
      const macdArr = MACD.calculate({ values: closes5, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
      const lastMacd = macdArr.at(-1);
      const macdBullish = lastMacd && lastMacd.MACD !== undefined && lastMacd.signal !== undefined && lastMacd.MACD > lastMacd.signal;
      if (macdBullish) { techScore += 5; reasons.push('MACD line above signal — momentum confirmed'); }

      // Bonus: Bollinger
      const bb = BollingerBands.calculate({ period: 20, values: closes5, stdDev: 2 });
      const lastBB = bb.at(-1);
      const price = closes5.at(-1)!;
      let bbSignal = 'MID';
      if (lastBB && price <= lastBB.lower) { techScore += 3; bbSignal = 'OVERSOLD'; reasons.push('Price at lower Bollinger Band — oversold buying opportunity'); }
      else if (lastBB && price >= lastBB.upper) { bbSignal = 'OVERBOUGHT'; }

      // Bonus: Volume spike
      if (vols5.length >= 20) {
        const avgVol = vols5.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
        if (vols5.at(-1)! > avgVol * 1.5) { techScore += 2; reasons.push('Volume spike detected — strong institutional interest'); }
      }

      // Fundamental score
      let fundScore = 0;
      const eps = quote.epsTrailingTwelveMonths || (quote.trailingPE && quote.regularMarketPrice ? quote.regularMarketPrice / quote.trailingPE : 0);
      const pe = quote.trailingPE || 0;
      let ivPe = 0, marginOfSafety = 0, valuationSignal = 'INSUFFICIENT_DATA';
      const currentPrice = quote.regularMarketPrice || 0;

      if (eps > 0 && pe > 0) {
        const growthRate = quote.earningsQuarterlyGrowth || 0.1;
        ivPe = eps * (1 + growthRate) * pe;
        marginOfSafety = ((ivPe - currentPrice) / ivPe) * 100;
        if (marginOfSafety > 20) { fundScore += 8; valuationSignal = 'UNDERVALUED'; reasons.push(`Intrinsic value ₹${ivPe.toFixed(0)} vs ₹${currentPrice.toFixed(0)} — ${marginOfSafety.toFixed(0)}% undervalued`); }
        else if (marginOfSafety > 10) { fundScore += 5; valuationSignal = 'UNDERVALUED'; }
        else if (marginOfSafety > 0) { fundScore += 2; valuationSignal = 'FAIRLY_VALUED'; }
        else { valuationSignal = 'OVERVALUED'; }
      }

      // P/E scoring
      if (pe > 0 && pe < 15) fundScore += 3;
      else if (pe >= 15 && pe <= 25) fundScore += 1;

      // D/E scoring
      const debtEquity = quote.debtToEquity ? quote.debtToEquity / 100 : null;
      if (debtEquity !== null) {
        if (debtEquity < 0.2) { fundScore += 3; reasons.push(`D/E ratio of ${debtEquity.toFixed(2)} — conservative capital structure`); }
        else if (debtEquity <= 0.5) fundScore += 1;
      }

      const compositeScore = Math.round(fundScore * 0.2 + techScore * 0.8);
      let signal = 'AVOID';
      if (compositeScore >= 75) signal = 'STRONG BUY';
      else if (compositeScore >= 50) signal = 'BUY';
      else if (compositeScore >= 30) signal = 'HOLD';

      return {
        ticker,
        name: quote.longName || quote.shortName || ticker,
        price: currentPrice,
        change: quote.regularMarketChangePercent || 0,
        compositeScore, techScore, fundScore,
        signal,
        rsi: Number(rsiVal.toFixed(2)),
        stochK: lastStoch ? Number(lastStoch.k.toFixed(2)) : null,
        stochD: lastStoch ? Number(lastStoch.d.toFixed(2)) : null,
        macdSignal: macdBullish ? 'BULLISH' : 'BEARISH',
        bbSignal,
        intrinsicValue: Number(ivPe.toFixed(2)),
        marginOfSafety: Number(marginOfSafety.toFixed(2)),
        valuationSignal,
        pe: pe ? Number(pe.toFixed(2)) : null,
        debtEquity: debtEquity ? Number(debtEquity.toFixed(2)) : null,
        marketCap: quote.marketCap || 0,
        stage1Pass: stage1, stage2Pass: stage2, stage3Pass: stage3, stage4Pass: stage4,
        reasons: reasons.slice(0, 5),
        emaTrend30m: stage1 ? 'BULLISH' : 'BEARISH',
        emaTrend5m: stage2 ? 'BULLISH' : 'BEARISH',
      };
    } catch (err: any) {
      console.error('Signal error for', ticker, err.message);
      return null;
    }
  }

  // --- Stock API ---
  app.get('/api/stocks/suggestions', authenticate, async (req: any, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { settings: true } });
    let watchlist = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'AMD', 'NFLX', 'JPM', 'V', 'BA', 'DIS', 'INTC', 'PYPL', 'CRM', 'UBER', 'SQ', 'COIN', 'PLTR'];
    if (user?.settings?.watchlist) {
      try { const parsed = JSON.parse(user.settings.watchlist); if (parsed.length) watchlist = parsed; } catch {}
    }

    const results = [];
    for (const t of watchlist) {
      const sig = await computeSignal(t);
      if (sig) results.push(sig);
      await new Promise(r => setTimeout(r, 300)); // rate limit
    }
    results.sort((a, b) => b.compositeScore - a.compositeScore);
    res.json(results);
  });

  app.get('/api/stocks/:ticker/profile', async (req: any, res) => {
    try {
      const { ticker } = req.params;
      const quote: any = await yf.quote(ticker);
      const signal = await computeSignal(ticker);
      res.json({
        ticker,
        name: quote.longName || quote.shortName,
        sector: quote.sector || 'N/A',
        industry: quote.industry || 'N/A',
        price: quote.regularMarketPrice,
        change: quote.regularMarketChangePercent,
        marketCap: quote.marketCap,
        pe: quote.trailingPE,
        forwardPe: quote.forwardPE,
        eps: quote.epsTrailingTwelveMonths,
        debtEquity: quote.debtToEquity ? quote.debtToEquity / 100 : null,
        revenueGrowth: quote.revenueGrowth,
        dividendYield: quote.dividendYield,
        beta: quote.beta,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        bookValue: quote.bookValue,
        freeCashflow: quote.freeCashflow,
        signal,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/stocks/:ticker/score', async (req: any, res) => {
    const signal = await computeSignal(req.params.ticker);
    if (!signal) return res.status(500).json({ error: 'Could not compute signal' });
    res.json(signal);
  });

  app.get('/api/stocks/:ticker/chart', async (req: any, res) => {
    const { ticker } = req.params;
    const tf = (req.query.timeframe as string) || '1d';
    const intervalMap: Record<string, string> = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '60m', '1d': '1d', '1w': '1wk' };
    const periodMap: Record<string, number> = { '1m': 1, '5m': 2, '15m': 5, '30m': 10, '1h': 30, '1d': 365, '1w': 730 };
    const interval = intervalMap[tf] || '1d';
    const days = periodMap[tf] || 365;

    try {
      const chart = await yf.chart(ticker, {
        period1: new Date(Date.now() - days * 24 * 3600000),
        period2: new Date(),
        interval: interval as any,
      });
      const data = (chart.quotes || []).filter((c: any) => c.close).map((c: any) => ({
        time: Math.floor(new Date(c.date).getTime() / 1000),
        open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume,
      }));
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- Trading (paper stubs) ---
  app.post('/api/trade/buy', authenticate, async (req: any, res) => {
    const { ticker, qty, price, orderType } = req.body;
    try {
      const trade = await prisma.trade.create({
        data: { userId: req.user.id, ticker, side: 'BUY', entryPrice: price, qty: qty, status: 'FILLED' }
      });
      res.json({ message: 'Buy order filled (paper)', trade });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/trade/sell', authenticate, async (req: any, res) => {
    const { ticker, qty, price } = req.body;
    try {
      const trade = await prisma.trade.create({
        data: { userId: req.user.id, ticker, side: 'SELL', entryPrice: price, qty: qty, status: 'FILLED' }
      });
      res.json({ message: 'Sell order filled (paper)', trade });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post('/api/trade/close/:tradeId', authenticate, async (req: any, res) => {
    try {
      const trade = await prisma.trade.update({
        where: { id: req.params.tradeId },
        data: { status: 'CLOSED', exitTime: new Date(), exitReason: 'MANUAL' }
      });
      res.json({ message: 'Position closed', trade });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/trade/history', authenticate, async (req: any, res) => {
    const trades = await prisma.trade.findMany({ where: { userId: req.user.id }, orderBy: { entryTime: 'desc' }, take: 50 });
    res.json(trades);
  });

  // --- Portfolio ---
  app.get('/api/portfolio/positions', authenticate, async (req: any, res) => {
    const trades = await prisma.trade.findMany({ where: { userId: req.user.id, status: 'FILLED' } });
    res.json(trades);
  });

  app.get('/api/portfolio/summary', authenticate, async (req: any, res) => {
    const trades = await prisma.trade.findMany({ where: { userId: req.user.id } });
    const closed = trades.filter(t => t.status === 'CLOSED');
    const open = trades.filter(t => t.status === 'FILLED');
    const totalPnl = closed.reduce((s, t) => s + (t.grossPnl || 0), 0);
    const wins = closed.filter(t => (t.grossPnl || 0) > 0).length;
    res.json({
      equity: 100000,
      cashBalance: 100000 - open.reduce((s, t) => s + t.entryPrice * t.qty, 0),
      totalTrades: trades.length,
      openPositions: open.length,
      realizedPnl: totalPnl,
      winRate: closed.length > 0 ? Math.round((wins / closed.length) * 100) : 0,
    });
  });

  // --- Serve frontend ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
