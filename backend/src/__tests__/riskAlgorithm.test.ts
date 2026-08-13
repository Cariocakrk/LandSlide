import { calculateRisk } from '../lib/riskAlgorithm';

describe('calculateRisk', () => {
  it('should return risk 0 and status Verde for all zero inputs', () => {
    const { risk, statusColor } = calculateRisk(0, 0, 0, 0);
    expect(risk).toBe(0);
    expect(statusColor).toBe('Verde');
  });

  it('should return risk 100 and status Vermelho for all maximum inputs', () => {
    const { risk, statusColor } = calculateRisk(100, 100, 100, 100);
    expect(risk).toBe(100);
    expect(statusColor).toBe('Vermelho');
  });

  it('should return correct weighted risk and color status', () => {
    // 50 * 0.35 = 17.5
    // 30 * 0.30 = 9
    // 20 * 0.20 = 4
    // 10 * 0.15 = 1.5
    // Total = 32 -> Verde (<= 40)
    const res1 = calculateRisk(50, 30, 20, 10);
    expect(res1.risk).toBe(32);
    expect(res1.statusColor).toBe('Verde');

    // 80 * 0.35 = 28
    // 60 * 0.30 = 18
    // 50 * 0.20 = 10
    // 30 * 0.15 = 4.5
    // Total = 60.5 -> 61 -> Amarelo (40 < risk <= 65)
    const res2 = calculateRisk(80, 60, 50, 30);
    expect(res2.risk).toBe(61);
    expect(res2.statusColor).toBe('Amarelo');
  });
});
