export function calculateRSI(candles: any[], period: number = 14): number {
  if (candles.length <= period) return 50;

  const closes = candles.map(c => c.close);
  let changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let gains = changes.map(ch => ch > 0 ? ch : 0);
  let losses = changes.map(ch => ch < 0 ? Math.abs(ch) : 0);

  // Initial average gain/loss (SMA of first 'period' elements)
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Wilder's Smoothing for subsequent values
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
