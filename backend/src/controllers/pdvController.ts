import { Request, Response } from 'express';
import { geocodeAddress } from '../utils/geocoding';
import { todayDateOnly } from '../utils/date';
import { parseCoordinate, distanceInMeters, median } from '../utils/location';
import { buildPdvImportTemplate, parsePdvImportWorkbook } from '../utils/pdvImport';
import { prisma } from '../lib/prisma';

const IMPORT_DEFAULT_RADIUS_METERS = 150;

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
  const { name, address, city, state, channel, network, radiusMeters, latitude, longitude } = req.body;
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
      channel: channel?.trim() || '',
      network: network?.trim() || '',
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
  const { name, address, city, state, channel, network, active, radiusMeters, latitude, longitude, clearCoordinates, forceGeocode } = req.body;

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
  if (channel !== undefined) updateData.channel = channel.trim();
  if (network !== undefined) updateData.network = network.trim();
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
  } else if (addressChanged || forceGeocode === true || forceGeocode === 'true') {
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

  await prisma.pDV.delete({ where: { id } });
  res.json({ success: true, data: null });
}

export async function downloadPdvImportTemplate(req: Request, res: Response): Promise<void> {
  const buffer = await buildPdvImportTemplate();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="modelo-importacao-pdvs.xlsx"');
  res.send(buffer);
}

export async function importPdvs(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'Selecione um arquivo .xlsx para importar.' });
    return;
  }

  let parsed;
  try {
    parsed = await parsePdvImportWorkbook(req.file.buffer);
  } catch (err) {
    res.status(400).json({ success: false, error: 'Não foi possível ler o arquivo. Confirme que é um .xlsx válido.' });
    return;
  }

  const messages = [...parsed.messages];
  let created = 0;
  let updated = 0;

  for (const row of parsed.rows) {
    try {
      const existing = await prisma.pDV.findFirst({
        where: {
          name: { equals: row.name, mode: 'insensitive' },
          address: { equals: row.address, mode: 'insensitive' },
        },
      });

      if (existing) {
        await prisma.pDV.update({
          where: { id: existing.id },
          data: {
            city: row.city,
            state: row.state,
            channel: row.channel,
            network: row.network,
            active: row.active,
          },
        });
        updated++;
      } else {
        await prisma.pDV.create({
          data: {
            name: row.name,
            address: row.address,
            city: row.city,
            state: row.state,
            channel: row.channel,
            network: row.network,
            active: row.active,
            radiusMeters: IMPORT_DEFAULT_RADIUS_METERS,
          },
        });
        created++;
      }
    } catch (err) {
      messages.push({ row: row.rowNumber, type: 'error', text: 'Erro ao salvar essa linha. Tente novamente.' });
    }
  }

  res.json({
    success: true,
    data: {
      totalRows: parsed.rows.length,
      created,
      updated,
      messages,
      note: 'Coordenadas não são calculadas no import em massa (evita estourar o tempo do servidor). PDVs novos entram com raio de 150m mas aparecem "Sem área" até você configurar a coordenada em cada um.',
    },
  });
}

const GPS_SUGGESTION_SAMPLE_LIMIT = 20;

export async function getPdvGpsSuggestion(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const pdv = await prisma.pDV.findUnique({ where: { id } });
  if (!pdv) {
    res.status(404).json({ success: false, error: 'PDV não encontrado.' });
    return;
  }

  const visits = await prisma.visit.findMany({
    where: { pdvId: id, latitudeStart: { not: null }, longitudeStart: { not: null } },
    orderBy: { startedAt: 'desc' },
    take: GPS_SUGGESTION_SAMPLE_LIMIT,
    select: { latitudeStart: true, longitudeStart: true },
  });

  if (visits.length === 0) {
    res.json({ success: true, data: { suggestion: null, samples: 0, distanceMeters: null } });
    return;
  }

  const suggestion = {
    latitude: median(visits.map((v) => v.latitudeStart as number)),
    longitude: median(visits.map((v) => v.longitudeStart as number)),
  };

  const distanceMeters =
    pdv.latitude != null && pdv.longitude != null
      ? Math.round(distanceInMeters(pdv.latitude, pdv.longitude, suggestion.latitude, suggestion.longitude))
      : null;

  res.json({ success: true, data: { suggestion, samples: visits.length, distanceMeters } });
}
