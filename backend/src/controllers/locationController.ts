import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export async function pingLocation(req: AuthRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { latitude, longitude } = req.body;

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    res.status(400).json({ success: false, error: 'Latitude e longitude válidas são obrigatórias.' });
    return;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ success: false, error: 'Coordenadas fora do intervalo válido.' });
    return;
  }

  await prisma.promotorLocation.upsert({
    where: { userId },
    create: { userId, latitude: lat, longitude: lng },
    update: { latitude: lat, longitude: lng },
  });

  res.json({ success: true, data: null });
}
