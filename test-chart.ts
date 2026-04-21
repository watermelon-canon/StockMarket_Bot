import { YahooFinance } from 'yahoo-finance2';
const yf = new YahooFinance();
yf.chart('AAPL', { period1: '2023-01-01', interval: '1d' }).then(res => console.log(Object.keys(res), res.quotes?.length, res.indicators?.quote[0]?.close?.length)).catch(console.error);
