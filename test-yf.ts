import yf from 'yahoo-finance2';
async function test() {
  const chart = await yf.chart('AAPL', { period1: new Date(Date.now() - 30 * 24 * 3600000), period2: new Date(), interval: '1d' });
  const data = (chart.quotes || []).filter(c => c.close).map(c => {
    let timeVal = new Date(c.date).toISOString().split('T')[0];
    return { time: timeVal, close: c.close };
  });
  console.log(data);
}
test().catch(console.error);
