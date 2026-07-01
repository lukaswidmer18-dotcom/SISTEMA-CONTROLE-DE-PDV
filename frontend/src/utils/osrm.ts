const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

interface OsrmResponse {
  code: string;
  routes?: { geometry: { coordinates: [number, number][] } }[];
}

export async function getRouteGeometry(points: [number, number][]): Promise<[number, number][] | null> {
  if (points.length < 2) return null;

  const coords = points.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `${OSRM_URL}/${coords}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const result = (await response.json()) as OsrmResponse;
    if (result.code !== 'Ok' || !result.routes?.length) return null;
    return result.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch {
    return null;
  }
}
