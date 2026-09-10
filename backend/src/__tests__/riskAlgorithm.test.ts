import { calculateRisk, calculateGeotechnicalRisk } from '../lib/riskAlgorithm';

describe('Motor Geotécnico de Estabilidade de Taludes (riskAlgorithm)', () => {
  describe('calculateRisk (Compatibilidade e Geotecnia)', () => {
    it('deve retornar risco 0 e status Verde para terreno plano sem saturação', () => {
      const res = calculateRisk(0, 0, 0, 0);
      expect(res.risk).toBe(0);
      expect(res.statusColor).toBe('Verde');
      expect(res.safetyFactor).toBe(99);
      expect(res.riskLevelCode).toBe('R1');
    });

    it('deve retornar risco crítico e status Vermelho para encosta íngreme sob chuva torrencial', () => {
      // 45 graus de declividade, 100% solo saturado, 120mm de chuva acumulada
      const res = calculateRisk(100, 45, 120, 20);
      expect(res.risk).toBeGreaterThanOrEqual(85);
      expect(res.statusColor).toBe('Vermelho');
      expect(res.safetyFactor).toBeLessThanOrEqual(1.0);
      expect(res.riskLevelCode).toBe('R4');
    });
  });

  describe('calculateGeotechnicalRisk (Talude Infinito e Mohr-Coulomb)', () => {
    it('deve classificar terreno plano como R1 (Baixo / Estável) com FS elevado', () => {
      const res = calculateGeotechnicalRisk({
        slopeDeg: 1.5,
        accumulatedRain72h: 80,
        soilMoisturePercent: 70
      });
      expect(res.safetyFactor).toBe(99);
      expect(res.statusColor).toBe('Verde');
      expect(res.riskLevelCode).toBe('R1');
      expect(res.classification).toBe('Baixo');
    });

    it('deve classificar encosta moderada (18°) com chuva de atenção (45mm) como R2 (Atenção)', () => {
      const res = calculateGeotechnicalRisk({
        slopeDeg: 18,
        accumulatedRain72h: 45,
        soilMoisturePercent: 55
      });
      expect(res.statusColor).toBe('Amarelo');
      expect(res.riskLevelCode).toBe('R2');
      expect(res.classification).toBe('Médio / Atenção');
    });

    it('deve classificar encosta íngreme (32°) com chuva intensa (75mm) como R3 (Alerta)', () => {
      const res = calculateGeotechnicalRisk({
        slopeDeg: 32,
        accumulatedRain72h: 75,
        soilMoisturePercent: 75
      });
      expect(res.statusColor).toBe('Laranja');
      expect(res.riskLevelCode).toBe('R3');
      expect(res.safetyFactor).toBeLessThan(1.3);
      expect(res.classification).toBe('Alto / Alerta');
    });

    it('deve detectar colapso iminente (FS <= 1.0) em encosta crítica saturada (R4 Emergência)', () => {
      const res = calculateGeotechnicalRisk({
        slopeDeg: 38,
        accumulatedRain72h: 130,
        soilMoisturePercent: 95,
        curvature: 'concave' // convergência de fluxo hídrico acelerando poropressão
      });
      expect(res.safetyFactor).toBeLessThanOrEqual(1.0);
      expect(res.statusColor).toBe('Vermelho');
      expect(res.riskLevelCode).toBe('R4');
      expect(res.classification).toBe('Muito Alto / Emergência');
      expect(res.diagnosis).toContain('R4');
    });
  });
});
