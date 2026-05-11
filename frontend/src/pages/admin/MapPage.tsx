import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, RefreshCw, Filter, Navigation, Clock, Store, Activity } from 'lucide-react';
import api from '../../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Fix for default marker icons in Leaflet with React
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface TrailPoint {
  lat: number;
  lng: number;
  time: string;
  type: string;
  label: string;
  state: string | null;
}

interface MapPromotorData {
  promotorId: string;
  promotorName: string;
  status: 'INATIVO' | 'LOGADO' | 'EM_VISITA';
  currentPDV: string | null;
  lastState: string | null;
  lastLocation: { lat: number; lng: number; time: string } | null;
  trail: TrailPoint[];
}

const TRAIL_COLORS = ['#EAB308', '#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B', '#06B6D4', '#EC4899'];

const UF_COORDINATES: Record<string, [number, number]> = {
  'AC': [-9.0238, -70.8120], 'AL': [-9.5713, -36.7820], 'AP': [1.4154, -51.7701],
  'AM': [-3.4168, -65.8561], 'BA': [-12.5797, -41.7007], 'CE': [-5.4984, -39.3206],
  'DF': [-15.7998, -47.8645], 'ES': [-19.1834, -40.3089], 'GO': [-15.8270, -49.8362],
  'MA': [-5.4241, -45.4442], 'MT': [-12.6819, -56.9211], 'MS': [-20.7722, -54.7852],
  'MG': [-18.5122, -44.5550], 'PA': [-1.9981, -54.9306], 'PB': [-7.2400, -36.7820],
  'PR': [-24.8163, -51.5714], 'PE': [-8.8137, -36.9541], 'PI': [-7.7183, -42.7289],
  'RJ': [-22.3966, -42.9151], 'RN': [-5.7945, -36.5085], 'RS': [-30.0346, -51.2177],
  'RO': [-10.8300, -63.3400], 'RR': [2.7376, -62.0751], 'SC': [-27.2423, -50.2189],
  'SP': [-23.5505, -46.6333], 'SE': [-10.5741, -37.3857], 'TO': [-10.1753, -48.3317]
};

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map]);
  return null;
}

export default function MapPage() {
  const [data, setData] = useState<MapPromotorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterState, setFilterState] = useState<string>('ALL');
  const [selectedPromotorId, setSelectedPromotorId] = useState<string | null>(null);

  const UFS = Object.keys(UF_COORDINATES).sort();

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/map/today');
      if (response.data.success) {
        setData(response.data.data);
      } else {
        setError('Erro ao carregar dados do mapa.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredData = data.filter(p => {
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    if (filterState !== 'ALL' && p.lastState !== filterState) return false;
    if (selectedPromotorId && p.promotorId !== selectedPromotorId) return false;
    return true;
  });

  const getMapSettings = (): { center: [number, number], zoom: number } => {
    if (selectedPromotorId) {
      const p = data.find(p => p.promotorId === selectedPromotorId);
      if (p?.lastLocation) return { center: [p.lastLocation.lat, p.lastLocation.lng], zoom: 15 };
    }
    if (filterState !== 'ALL' && UF_COORDINATES[filterState]) {
      return { center: UF_COORDINATES[filterState], zoom: 7 };
    }
    return { center: [-15.7801, -47.9292], zoom: 4 };
  };

  const { center, zoom } = getMapSettings();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EM_VISITA': return 'bg-green-500';
      case 'LOGADO': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'EM_VISITA': return 'Em Visita';
      case 'LOGADO': return 'Ponto Batido';
      default: return 'Inativo';
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-4">
      <aside className="w-full lg:w-80 flex flex-col gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-bold flex items-center gap-2">
              <Filter size={18} className="text-pluma-600" />
              Filtros
            </h3>
            <button onClick={fetchData} disabled={loading} className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-gray-500">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-pluma-500 outline-none transition-all">
                  <option value="ALL">Todos</option>
                  <option value="EM_VISITA">Em Visita</option>
                  <option value="LOGADO">Ponto</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Estado</label>
                <select value={filterState} onChange={(e) => { setFilterState(e.target.value); setSelectedPromotorId(null); }} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-xs focus:ring-2 focus:ring-pluma-500 outline-none transition-all">
                  <option value="ALL">Brasil</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Promotor</label>
              <select value={selectedPromotorId || ''} onChange={(e) => setSelectedPromotorId(e.target.value || null)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-pluma-500 outline-none transition-all">
                <option value="">Todos os Promotores</option>
                {data.map(p => <option key={p.promotorId} value={p.promotorId}>{p.promotorName}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <h3 className="text-gray-900 font-bold flex items-center gap-2">
              <Activity size={18} className="text-pluma-600" />
              Monitoramento ({filteredData.length})
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredData.map((p, idx) => (
              <button key={p.promotorId} onClick={() => setSelectedPromotorId(p.promotorId)} className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${selectedPromotorId === p.promotorId ? 'bg-pluma-50 border border-pluma-100 shadow-sm' : 'hover:bg-gray-50'}`}>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getStatusColor(p.status)} shadow-sm`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.promotorName}</p>
                  <p className="text-[10px] text-gray-500 truncate">{p.currentPDV ? `No PDV: ${p.currentPDV}` : getStatusLabel(p.status)}</p>
                </div>
                {p.lastLocation && <p className="text-[10px] font-medium text-gray-400">{format(new Date(p.lastLocation.time), 'HH:mm')}</p>}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative z-0">
        <MapContainer center={center} zoom={zoom} className="h-full w-full" style={{ background: '#f8fafc' }}>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ChangeView center={center} zoom={zoom} />
          {filteredData.map((p, pIdx) => {
            if (!p.lastLocation) return null;
            const color = TRAIL_COLORS[pIdx % TRAIL_COLORS.length];
            const validTrailPoints = p.trail.filter(tp => tp.lat && tp.lng);
            const polylinePoints = validTrailPoints.map(tp => [tp.lat, tp.lng] as [number, number]);
            return (
              <React.Fragment key={p.promotorId}>
                {polylinePoints.length > 1 && <Polyline positions={polylinePoints} color={color} weight={4} opacity={0.6} dashArray="5, 10" />}
                {selectedPromotorId === p.promotorId && validTrailPoints.map((tp, tpIdx) => (
                  <Marker key={`${p.promotorId}-tp-${tpIdx}`} position={[tp.lat, tp.lng]} icon={L.divIcon({ className: 'custom-div-icon', html: `<div style="background-color: ${color}; width: 8px; height: 8px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`, iconSize: [8, 8], iconAnchor: [4, 4] })}>
                    <Popup><div className="text-[11px] leading-tight"><p className="font-bold text-gray-800">{tp.label}</p><p className="text-gray-500">{format(new Date(tp.time), 'HH:mm', { locale: ptBR })}</p></div></Popup>
                  </Marker>
                ))}
                <Marker position={[p.lastLocation.lat, p.lastLocation.lng]} icon={L.divIcon({ className: 'current-pos-icon', html: `<div style="position: relative; width: 40px; height: 40px;"><div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: ${color}; opacity: 0.2; border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div><div style="position: absolute; top: 10px; left: 10px; width: 20px; height: 20px; background-color: ${color}; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.2);"></div></div><style>@keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }</style>`, iconSize: [40, 40], iconAnchor: [20, 20] })}>
                  <Popup className="premium-popup">
                    <div className="w-52 p-1">
                      <div className="flex items-center gap-2 mb-2 border-b border-gray-100 pb-2"><div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(p.status)}`} /><h4 className="font-bold text-gray-900 leading-none">{p.promotorName}</h4></div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2"><Store size={14} className="text-gray-400 mt-0.5" /><div><p className="text-[10px] text-gray-400 uppercase font-bold leading-none mb-0.5">Local Atual</p><p className="text-[11px] font-semibold text-gray-700 leading-tight">{p.currentPDV || 'Fora de Visita'}</p></div></div>
                        <div className="flex items-start gap-2"><Clock size={14} className="text-gray-400 mt-0.5" /><div><p className="text-[10px] text-gray-400 uppercase font-bold leading-none mb-0.5">Última Atualização</p><p className="text-[11px] font-semibold text-gray-700 leading-tight">{format(new Date(p.lastLocation!.time), "HH:mm 'de' dd/MM", { locale: ptBR })}</p></div></div>
                        <div className="flex items-start gap-2"><Navigation size={14} className="text-gray-400 mt-0.5" /><div><p className="text-[10px] text-gray-400 uppercase font-bold leading-none mb-0.5">Conexão</p><p className={`text-[11px] font-bold leading-tight ${new Date().getTime() - new Date(p.lastLocation!.time).getTime() < 600000 ? 'text-green-600' : 'text-orange-500'}`}>{new Date().getTime() - new Date(p.lastLocation!.time).getTime() < 600000 ? 'Online (Ativo)' : 'Inativo há +10min'}</p></div></div>
                      </div>
                      <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${p.lastLocation!.lat},${p.lastLocation!.lng}`, '_blank')} className="w-full mt-3 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-1.5"><MapPin size={12} />Abrir no Google Maps</button>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
      <style>{`.premium-popup .leaflet-popup-content-wrapper { border-radius: 16px; padding: 4px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); } .premium-popup .leaflet-popup-content { margin: 12px; } .leaflet-container { font-family: inherit; }`}</style>
    </div>
  );
}
