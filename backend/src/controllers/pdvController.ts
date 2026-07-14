import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { geocodeAddress } from '../utils/geocoding';
import { todayDateOnly } from '../utils/date';
import { parseCoordinate } from '../utils/location';

const prisma = new PrismaClient();

const GEOCODE_FAILED_MESSAGE =
  'Não foi possível localizar este endereço no mapa. Verifique o endereço, cidade e UF e tente novamente, ou informe a coordenada manual.';
const GEOCODE_APPROXIMATE_MESSAGE =
  'Número do endereço não foi localizado com precisão; a coordenada ficou aproximada (nível da rua). Confira no mapa e ajuste manualmente se necessário.';

function parseRadiusMeters(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function parseManualCoords(latitude: unknown, longitude: unknown): { latitude: number; longitude: number } | null {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

export async function listPDVs(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  const isAdmin = authReq.user?.role === 'ADMIN';

  if (isAdmin) {
    const pdvs = await prisma.pDV.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: pdvs });
    return;
  }

  const routeEntries = await prisma.rotaVisita.findMany({
    where: { promotorId: authReq.user.userId, date: todayDateOnly(), pdv: { active: true } },
    include: { pdv: true },
    orderBy: { order: 'asc' },
  });

  res.json({ success: true, data: routeEntries.map((r) => r.pdv) });
}

export async function createPDV(req: Request, res: Response): Promise<void> {
  const { name, address, city, state, radiusMeters, latitude, longitude } = req.body;
  if (!name) {
    res.status(400).json({ success: false, error: 'Nome é obrigatório.' });
    return;
  }

  const trimmedAddress = address?.trim() || '';
  const trimmedCity = city?.trim() || '';
  const trimmedState = state?.trim()?.toUpperCase() || '';

  const manual = parseManualCoords(latitude, longitude);
  const geocoded = manual ? null : await geocodeAddress(trimmedAddress, trimmedCity, trimmedState);
  const coords = manual ?? geocoded;

  const pdv = await prisma.pDV.create({
    data: {
      name: name.trim(),
      address: trimmedAddress,
      city: trimmedCity,
      state: trimmedState,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      radiusMeters: parseRadiusMeters(radiusMeters) ?? null,
    },
  });

  res.status(201).json({
    success: true,
    data: pdv,
    ...(!coords && { warning: GEOCODE_FAILED_MESSAGE }),
    ...(geocoded?.approximate && { warning: GEOCODE_APPROXIMATE_MESSAGE }),
  });
}

export async function updatePDV(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, address, city, state, active, radiusMeters, latitude, longitude, clearCoordinates } = req.body;

  const pdv = await prisma.pDV.findUnique({ where: { id } });
  if (!pdv) {
    res.status(404).json({ success: false, error: 'PDV não encontrado.' });
    return;
  }

  const updateData: any = {};
  if (name) updateData.name = name.trim();
  if (address !== undefined) updateData.address = address.trim();
  if (city !== undefined) updateData.city = city.trim();
  if (state !== undefined) updateData.state = state.trim().toUpperCase();
  if (active !== undefined) updateData.active = Boolean(active);
  if (radiusMeters !== undefined) updateData.radiusMeters = parseRadiusMeters(radiusMeters);

  const nextAddress = updateData.address ?? pdv.address;
  const nextCity = updateData.city ?? pdv.city;
  const nextState = updateData.state ?? pdv.state;
  const addressChanged = nextAddress !== pdv.address || nextCity !== pdv.city || nextState !== pdv.state;

  const manual = parseManualCoords(latitude, longitude);
  let geocodeFailed = false;
  let geocodeApproximate = false;
  if (clearCoordinates === true || clearCoordinates === 'true') {
    if (nextAddress) {
      const geocoded = await geocodeAddress(nextAddress, nextCity, nextState);
      if (geocoded) {
        updateData.latitude = geocoded.latitude;
        updateData.longitude = geocoded.longitude;
        geocodeApproximate = geocoded.approximate;
      } else {
        updateData.latitude = null;
        updateData.longitude = null;
        geocodeFailed = true;
      }
    } else {
      updateData.latitude = null;
      updateData.longitude = null;
    }
  } else if (manual) {
    updateData.latitude = manual.latitude;
    updateData.longitude = manual.longitude;
  } else if (addressChanged) {
    const geocoded = await geocodeAddress(nextAddress, nextCity, nextState);
    if (geocoded) {
      updateData.latitude = geocoded.latitude;
      updateData.longitude = geocoded.longitude;
      geocodeApproximate = geocoded.approximate;
    } else {
      updateData.latitude = null;
      updateData.longitude = null;
      geocodeFailed = true;
    }
  }

  const updated = await prisma.pDV.update({ where: { id }, data: updateData });
  res.json({
    success: true,
    data: updated,
    ...(geocodeFailed && { warning: GEOCODE_FAILED_MESSAGE }),
    ...(geocodeApproximate && { warning: GEOCODE_APPROXIMATE_MESSAGE }),
  });
}

export async function togglePDVActive(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const pdv = await prisma.pDV.findUnique({ where: { id } });
  if (!pdv) {
    res.status(404).json({ success: false, error: 'PDV não encontrado.' });
    return;
  }

  const updated = await prisma.pDV.update({ where: { id }, data: { active: !pdv.active } });
  res.json({ success: true, data: updated });
}

export async function deletePDV(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const pdv = await prisma.pDV.findUnique({ where: { id } });
  if (!pdv) {
    res.status(404).json({ success: false, error: 'PDV não encontrado.' });
    return;
  }

  const [visitsCount, rotasCount] = await Promise.all([
    prisma.visit.count({ where: { pdvId: id } }),
    prisma.rotaVisita.count({ where: { pdvId: id } }),
  ]);

  if (visitsCount > 0 || rotasCount > 0) {
    res.status(409).json({
      success: false,
      error: 'Este PDV já tem histórico (visitas ou rotas) e não pode ser excluído. Use "Desativar" para removê-lo sem perder o histórico.',
    });
    return;
  }

  await prisma.pDV.delete({ where: { id } });
  res.json({ success: true, data: null });
}
