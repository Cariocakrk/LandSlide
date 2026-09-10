import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Populando banco de dados MySQL com dados iniciais...');

  // 1. Criar usuário Operador padrão da Defesa Civil
  const adminEmail = 'admin@defesacivil.gov.br';
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Operador Chefe - Defesa Civil',
        email: adminEmail,
        password: hashedPassword,
        role: 'OPERATOR',
        phoneNumber: '5524999999999',
        cep: '25680-195'
      }
    });
    console.log('[Seed] Usuário operador padrão criado: admin@defesacivil.gov.br / admin123');
  } else {
    console.log('[Seed] Usuário operador padrão já existe.');
  }

  // 2. Criar histórico inicial de leituras de telemetria geotécnica
  const sensorCount = await prisma.sensorData.count();
  if (sensorCount < 10) {
    const now = Date.now();
    const seedReadings = [
      { moisture: 35, slope: 14.2, rain: 8, vib: 0.5, risk: 12, status: 'Verde' },
      { moisture: 38, slope: 15.0, rain: 12, vib: 0.6, risk: 15, status: 'Verde' },
      { moisture: 42, slope: 16.1, rain: 22, vib: 0.8, risk: 20, status: 'Verde' },
      { moisture: 48, slope: 18.5, rain: 35, vib: 1.1, risk: 28, status: 'Verde' },
      { moisture: 54, slope: 21.0, rain: 44, vib: 1.5, risk: 42, status: 'Amarelo' },
      { moisture: 60, slope: 23.4, rain: 52, vib: 2.0, risk: 48, status: 'Amarelo' },
      { moisture: 68, slope: 26.8, rain: 65, vib: 3.2, risk: 58, status: 'Amarelo' },
      { moisture: 75, slope: 29.5, rain: 78, vib: 4.8, risk: 68, status: 'Laranja' },
      { moisture: 82, slope: 33.0, rain: 92, vib: 6.5, risk: 78, status: 'Laranja' },
      { moisture: 90, slope: 36.5, rain: 115, vib: 9.2, risk: 88, status: 'Vermelho' },
      { moisture: 95, slope: 38.0, rain: 140, vib: 14.0, risk: 94, status: 'Vermelho' },
      { moisture: 98, slope: 39.2, rain: 165, vib: 18.5, risk: 98, status: 'Vermelho' },
      // Retorno e drenagem
      { moisture: 85, slope: 35.0, rain: 90, vib: 5.0, risk: 72, status: 'Laranja' },
      { moisture: 65, slope: 25.0, rain: 40, vib: 2.0, risk: 45, status: 'Amarelo' },
      { moisture: 40, slope: 15.0, rain: 10, vib: 0.5, risk: 18, status: 'Verde' }
    ];

    let idx = 0;
    for (const r of seedReadings) {
      await prisma.sensorData.create({
        data: {
          sensorId: `EST-GEO-${(idx % 5) + 1}`,
          soilMoisture: r.moisture,
          terrainInclination: r.slope,
          rainVolume: r.rain,
          groundVibration: r.vib,
          riskLevel: r.risk,
          statusColor: r.status,
          createdAt: new Date(now - (seedReadings.length - idx) * 1800000)
        }
      });
      idx++;
    }
    console.log(`[Seed] Inseridas ${seedReadings.length} amostras de histórico geotécnico.`);
  }

  // 3. Criar protocolos de emergência de exemplo
  const protocolCount = await prisma.emergencyProtocol.count();
  if (protocolCount === 0) {
    await prisma.emergencyProtocol.create({
      data: {
        protocolCode: 'DC-2026-0841',
        riskLevel: 4,
        status: 'Equipe enviada',
        description: 'Encosta com saturação crítica (P72h > 120mm) no Alto da Serra. Evacuação preventiva iniciada.',
        alerts: {
          create: {
            cep: '25680-195',
            numResidents: 1420,
            channel: 'WhatsApp',
            status: 'ENVIADO',
            message: 'DEFESA CIVIL: Alerta Máximo de deslizamento para a região. Dirija-se imediatamente aos pontos de apoio.'
          }
        }
      }
    });

    await prisma.emergencyProtocol.create({
      data: {
        protocolCode: 'DC-2026-0842',
        riskLevel: 2,
        status: 'Em análise',
        description: 'Aumento da umidade do regolito e precipitação contínua nas últimas 24h.'
      }
    });

    console.log('[Seed] Protocolos da Defesa Civil criados.');
  }

  console.log('[Seed] Banco de dados populado com sucesso!');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
