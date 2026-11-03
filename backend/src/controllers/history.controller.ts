import { Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';

export async function getHistory(req: AuthRequest, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const level = (req.query.level as string) || '';
    const date = (req.query.date as string) || '';
    const limit = 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (level === 'critical') {
      where.statusColor = { in: ['Laranja', 'Vermelho'] };
    } else if (level === 'low') {
      where.statusColor = { in: ['Verde', 'Amarelo'] };
    }

    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const startDate = new Date(`${date}T00:00:00.000Z`);
      const endDate = new Date(`${date}T23:59:59.999Z`);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const data = await prisma.sensorData.findMany({
      where,
      take: limit,
      skip,
      orderBy: { createdAt: 'desc' }
    });
    const total = await prisma.sensorData.count({ where });

    res.json({
      data,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit))
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar histórico' });
  }
}
