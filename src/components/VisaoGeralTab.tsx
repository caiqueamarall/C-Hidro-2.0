import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, ZoomControl, LayersControl, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CloudRain, Droplets, Info, Calendar, X, Waves, Clock, TrendingDown, Equal, TrendingUp, HelpCircle, Loader2, Menu } from 'lucide-react';
// Helper to map Z-Score (Desvio Padrão) to our standard anomaly bands
const getAnomaliaFromZScore = (zScore: number | undefined | null, originalAnomalia: string) => {
  if (zScore === undefined || zScore === null) return originalAnomalia;
  
  if (zScore <= -2.0) return 'ANOMALIA_NEGATIVA_EXTREMA';
  if (zScore <= -1.5) return 'ANOMALIA_NEGATIVA_SEVERA';
  if (zScore <= -1.0) return 'ANOMALIA_NEGATIVA_MODERADA';
  if (zScore <= -0.5) return 'ANOMALIA_NEGATIVA_LEVE';
  if (zScore < 0.5) return 'NORMAL';
  if (zScore < 1.0) return 'ANOMALIA_POSITIVA_LEVE';
  if (zScore < 1.5) return 'ANOMALIA_POSITIVA_MODERADA';
  if (zScore < 2.0) return 'ANOMALIA_POSITIVA_SEVERA';
  return 'ANOMALIA_POSITIVA_EXTREMA';
};

// Create a custom icon function based on anomaly
const getIconProps = (anomalia: string, statusCota: number) => {
  let color = '#9e9e9e'; // default sem dados
  switch(anomalia) {
    case 'ANOMALIA_NEGATIVA_EXTREMA': color = '#d32f2f'; break;
    case 'ANOMALIA_NEGATIVA_SEVERA': color = '#f97316'; break;
    case 'ANOMALIA_NEGATIVA_MODERADA': color = '#eab308'; break;
    case 'ANOMALIA_NEGATIVA_LEVE': color = '#d9f99d'; break;
    case 'NORMAL': color = '#22c55e'; break;
    case 'ANOMALIA_POSITIVA_LEVE': color = '#93c5fd'; break;
    case 'ANOMALIA_POSITIVA_MODERADA': color = '#3b82f6'; break;
    case 'ANOMALIA_POSITIVA_SEVERA': color = '#1d4ed8'; break;
    case 'ANOMALIA_POSITIVA_EXTREMA': color = '#1e3a8a'; break;
  }

  let svg = '';
  if (statusCota === 1) { // Subindo
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`;
  } else if (statusCota === -1) { // Descendo
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>`;
  } else if (statusCota === 0) { // Estável
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="9" x2="19" y2="9"></line><line x1="5" y1="15" x2="19" y2="15"></line></svg>`;
  } else {
    svg = `<span style="color:white; font-weight:bold; font-size:12px;">?</span>`;
  }
  
  return { color, svg };
};

const markerIconCache = new Map();
const getMarkerIcon = (anomalia: string, statusCota: number) => {
  const cacheKey = `${anomalia}-${statusCota}`;
  if (markerIconCache.has(cacheKey)) {
    return markerIconCache.get(cacheKey);
  }

  const { color, svg } = getIconProps(anomalia, statusCota);
  
  const icon = L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; padding: 2px;">
             ${svg}
           </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
  
  markerIconCache.set(cacheKey, icon);
  return icon;
};

const reservatorioIconCache = new Map();
const getReservatorioIcon = (tipo: string) => {
  const isReservatorio = tipo.trim().toLowerCase() === 'reservatório';
  const cacheKey = isReservatorio ? 'reservatorio' : 'other';
  
  if (reservatorioIconCache.has(cacheKey)) {
    return reservatorioIconCache.get(cacheKey);
  }

  const icon = L.divIcon({
    className: 'custom-icon-reservatorio',
    html: `<div style="background-color: #16a34a; width: 18px; height: 18px; border-radius: ${isReservatorio ? '4px' : '50%'}; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
             <div style="background-color: white; width: 6px; height: 6px; border-radius: ${isReservatorio ? '1px' : '50%'};"></div>
           </div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
  
  reservatorioIconCache.set(cacheKey, icon);
  return icon;
};

const products = [
  { id: 'niveis_com4_principais', label: 'Níveis dos Rios Com4ºDN (Principais Hidrovias)', icon: Droplets, active: true },
  { id: 'niveis_com4', label: 'Nível dos Rios Com4ºDN', icon: Droplets, active: false },
  { id: 'niveis_amazonia', label: 'Nível dos Rios Amazônia Legal', icon: Droplets, active: false }
];



function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // ResizeObserver detects any size change to the map container (e.g. sidebar collapse)
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });
    const container = map.getContainer();
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
}

function KmzOverlay({ url }: { url: string }) {
  const map = useMap();
  useEffect(() => {
    // Inject leaflet-kmz script
    const scriptId = 'leaflet-kmz-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet-kmz@latest/dist/leaflet-kmz.js';
      script.async = true;
      document.head.appendChild(script);
    }
    
    const loadKmz = () => {
      if ((window as any).L && (window as any).L.kmzLayer) {
        const kmz = (window as any).L.kmzLayer().addTo(map);
        kmz.on('load', function(e: any) {
          e.layer.eachLayer((layer: any) => {
            if (layer.unbindPopup) layer.unbindPopup();
            if (layer.unbindTooltip) layer.unbindTooltip();
            if (layer.options) layer.options.interactive = false;
            if (layer.setStyle) layer.setStyle({ fillOpacity: 0, color: '#ef4444', weight: 2 });
            if (layer.getElement && layer.getElement()) {
              layer.getElement().style.pointerEvents = 'none';
            }
            if (layer._path) {
              layer._path.style.pointerEvents = 'none';
              layer._path.classList.remove('leaflet-interactive');
              layer._path.classList.add('kmz-non-interactive');
            }
          });
        });
        kmz.load(url);
      } else {
        setTimeout(loadKmz, 500); // Tenta de novo se a lib não injetou no L ainda
      }
    };
    
    script.addEventListener('load', loadKmz);
    
    if ((window as any).L && (window as any).L.kmzLayer) {
      loadKmz();
    }
    
    return () => {
      script.removeEventListener('load', loadKmz);
    };
  }, [map, url]);
  
  return null;
}

export default function VisaoGeralTab() {
  const [activeProduct, setActiveProduct] = useState('niveis_com4_principais');
  const [estacoes, setEstacoes] = useState<any[]>([]);
  const [hidreletricas, setHidreletricas] = useState<any[]>([]);
  const [isProductsSidebarOpen, setIsProductsSidebarOpen] = useState(true);
  const [baciasGeoJson, setBaciasGeoJson] = useState<any>(null);
  const [chuvaOpacity, setChuvaOpacity] = useState<number>(100);
  const [selectedBacia, setSelectedBacia] = useState<any>(null);
  const [baciaChuvaData, setBaciaChuvaData] = useState<any>(null);
  const [chuvaViewType, setChuvaViewType] = useState<string>('GRADE');
  const [estimador, setEstimador] = useState<string>('NOAA');
  const [chuvaDate, setChuvaDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const onBaciaClick = (feature: any, layer: any) => {
    layer.on({
      click: async (e: any) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        setSelectedBacia({ feature, latlng: { lat, lng } });
        setBaciaChuvaData(null);
        try {
          const cobacia = feature.properties.codigo_sub_bacia || feature.properties.cobacia || '0';
          const response = await fetch(`http://127.0.0.1:8000/api/subbacia/${cobacia}/chuva?lat=${lat}&lng=${lng}&date=${chuvaDate}&estimador=${estimador}`);
          const d = await response.json();
          if (!d.error) setBaciaChuvaData(d);
        } catch (error) {
          console.error(error);
        }
      }
    });
  };

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/bacias')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setBaciasGeoJson(data);
      })
      .catch(console.error);

    fetch(`/estacoes.json`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(res => res.json())
      .then(data => {
        // C-Hidro original data already maps anomalia_censipam to anomalia, but we keep our robust getAnomaliaFromZScore
        const processedData = data.map((est: any) => ({
          ...est,
          anomalia_censipam: est.anomalia,
          anomalia: (est.zScore !== undefined && est.zScore !== null) 
            ? getAnomaliaFromZScore(est.zScore, est.anomalia) 
            : est.anomalia
        }));
        setEstacoes(processedData);
      })
      .catch(err => console.error("Error fetching data:", err));
      
    fetch('https://apihidro.sipam.gov.br/hidreletricas/')
      .then(res => res.json())
      .then(data => setHidreletricas(data))
      .catch(err => console.error("Error fetching hidreletricas:", err));
  }, []);

  return (
    <div className="flex h-[calc(100vh-60px)] w-full overflow-hidden bg-slate-50 relative">
      <aside className={`bg-white shadow-2xl z-20 flex flex-col h-full border-r border-slate-200 transition-all duration-300 ${isProductsSidebarOpen ? 'w-72' : 'w-12 items-center'}`}>
          <div className="flex flex-col h-full overflow-hidden w-full relative">
            <button 
              onClick={() => setIsProductsSidebarOpen(!isProductsSidebarOpen)}
              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded z-30"
              title={isProductsSidebarOpen ? "Ocultar Menu" : "Mostrar Menu"}
            >
              {isProductsSidebarOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <div className={`flex-1 overflow-y-auto p-4 space-y-2 mt-6 ${!isProductsSidebarOpen ? 'hidden' : ''}`}>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Produtos</h2>
            
              {products.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveProduct(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    activeProduct === item.id 
                      ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${activeProduct === item.id ? 'text-blue-600' : 'text-slate-400'} flex-shrink-0`} />
                  <span className="text-[13px] leading-tight text-left font-medium">{item.label}</span>
                </button>
              ))}
            </div>
            
            {/* MAP LEGEND (Moved to bottom of sidebar, smaller) */}
            {activeProduct.startsWith('niveis') && isProductsSidebarOpen && (
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <h3 className="text-[11px] font-bold text-slate-700 mb-2">Legenda</h3>
                
                {/* Color Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[8px] font-bold text-slate-700 mb-1 px-2">
                    <span>Anomalias (-)</span>
                    <span>Anomalias (+)</span>
                  </div>
                  <div className="flex w-full h-2 rounded overflow-hidden">
                    <div className="flex-1 bg-[#da0000]"></div>
                    <div className="flex-1 bg-[#fb9003]"></div>
                    <div className="flex-1 bg-[#ffcc00]"></div>
                    <div className="flex-1 bg-[#fef0b7]"></div>
                    <div className="flex-1 bg-[#0b8e05]"></div>
                    <div className="flex-1 bg-[#a3d4ff]"></div>
                    <div className="flex-1 bg-[#4fa7ff]"></div>
                    <div className="flex-1 bg-[#1268db]"></div>
                    <div className="flex-1 bg-[#082970]"></div>
                  </div>
                  <div className="flex w-full mt-0.5 text-[6px] font-bold text-slate-800 text-center tracking-tighter">
                    <div className="flex-1">Extr.</div>
                    <div className="flex-1">Sev.</div>
                    <div className="flex-1 leading-[6px]">Mod.</div>
                    <div className="flex-1">Leve</div>
                    <div className="flex-1">Norm.</div>
                    <div className="flex-1">Leve</div>
                    <div className="flex-1 leading-[6px]">Mod.</div>
                    <div className="flex-1">Sev.</div>
                    <div className="flex-1">Extr.</div>
                  </div>
                </div>
                
                {/* Trend Icons */}
                <div className="flex justify-between items-center px-1">
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-5 h-5 bg-slate-600 rounded flex items-center justify-center text-white shadow-sm">
                      <TrendingDown className="w-3 h-3" />
                    </div>
                    <span className="text-[8px] font-bold text-black">Descendo</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-5 h-5 bg-slate-600 rounded flex items-center justify-center text-white shadow-sm">
                      <Equal className="w-3 h-3" />
                    </div>
                    <span className="text-[8px] font-bold text-black">Estável</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-5 h-5 bg-slate-600 rounded flex items-center justify-center text-white shadow-sm">
                      <TrendingUp className="w-3 h-3" />
                    </div>
                    <span className="text-[8px] font-bold text-black">Subindo</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-5 h-5 bg-slate-300 rounded flex items-center justify-center text-white shadow-sm">
                      <HelpCircle className="w-3 h-3" />
                    </div>
                    <span className="text-[8px] font-normal text-slate-600">S/ dados</span>
                  </div>
                </div>
              </div>
            )}
          </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        <div style={{ display: 'block', height: '100%', width: '100%', position: 'relative' }}>
          
          {/* Chuva Mosaico Control Panel */}
          {activeProduct === 'chuva' && (
            <div className="absolute top-4 left-4 z-[1000] w-[300px] bg-white/95 backdrop-blur-sm shadow-xl rounded-xl border border-slate-200 overflow-hidden flex flex-col pointer-events-auto transition-all">
              <div className="bg-[#4a8559] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <CloudRain className="w-5 h-5" />
                  <span className="font-semibold text-sm">Chuva em Bacia Hidrográfica</span>
                </div>
                <div className="w-8 h-4 bg-green-300 rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="p-4 flex flex-col gap-5">
                {/* Legenda */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Legenda</h4>
                  <div className="text-[10px] text-slate-500 text-center mb-1">Precipitação acumulada (24h)</div>
                  <div className="h-3 w-full bg-gradient-to-r from-yellow-100 via-blue-400 to-purple-900 rounded-sm"></div>
                  <div className="flex justify-between text-[9px] text-slate-500 mt-1 px-1">
                    <span>1</span>
                    <span>10</span>
                    <span>30</span>
                    <span>60</span>
                    <span>100</span>
                    <span>150</span>
                  </div>
                </div>

                {/* Controles */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-700 mb-3 border-b border-slate-100 pb-1">Controles</h4>
                  
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[11px] text-slate-500 mb-1 block">Data</label>
                      <div className="relative">
                        <input 
                          type="date" 
                          value={chuvaDate}
                          onChange={(e) => setChuvaDate(e.target.value)}
                          className="w-full bg-slate-900 text-white text-xs px-3 py-2 rounded-md appearance-none"
                        />
                        <Calendar className="absolute right-2 top-2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[11px] text-slate-500 mb-1 block">Estimador</label>
                      <select 
                        value={estimador}
                        onChange={(e) => setEstimador(e.target.value)}
                        className="w-full bg-slate-900 text-white text-xs px-3 py-2 rounded-md outline-none"
                      >
                        <option value="NOAA">NOAA</option>
                        <option value="INPE">INPE</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-[11px] text-slate-500 mb-1 block">Visualização</label>
                      <select 
                        value={chuvaViewType}
                        onChange={(e) => setChuvaViewType(e.target.value)}
                        className="w-full bg-slate-900 text-white text-xs px-3 py-2 rounded-md outline-none"
                      >
                        <option value="GRADE">GRADE</option>
                        <option value="POLÍGONOS">POLÍGONOS</option>
                      </select>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] text-slate-500 flex items-center gap-1">Opacidade <Info className="w-3 h-3"/></label>
                        <span className="text-[11px] text-slate-500">{chuvaOpacity}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="100" 
                        value={chuvaOpacity} 
                        onChange={(e) => setChuvaOpacity(parseInt(e.target.value))}
                        className="w-full accent-[#4a8559] h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <MapContainer 
            center={[-3.119, -60.021]} 
            zoom={5} 
            zoomControl={false}
            className="h-full w-full z-10"
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="OpenStreetMap">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Google Satélite">
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                  maxZoom={20}
                  attribution="Google Maps"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Google Híbrido">
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  maxZoom={20}
                  attribution="Google Maps"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Google Ruas">
                <TileLayer
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                  maxZoom={20}
                  attribution="Google Maps"
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            
            <ZoomControl position="bottomright" />
            <MapResizer />

          {/* KMZ Overlay */}
          <KmzOverlay url={'/Com4DN.kmz'} />

          {/* Render All Stations Only for Niveis */}
          {(['niveis_com4_principais', 'niveis_com4', 'niveis_amazonia'].includes(activeProduct)) && estacoes.filter(estacao => {
              if (activeProduct === 'niveis_amazonia') return true;
              
              if (activeProduct === 'niveis_com4_principais') {
                  const com4_ids = [
                    31645000, 29680090, 29050000, 29070100, 18850000, 18867900, 
                    18950003, 18390000, 19500000, 19152500, 17900000, 17730000, 
                    17050001, 16900000, 18936000
                  ];
                  return com4_ids.includes(Number(estacao.codigo));
              }
              
              if (activeProduct === 'niveis_com4') {
                  const lat = estacao.latitude;
                  const lng = estacao.longitude;
                  
                  // Bounding box filter for PA, AP, MA, PI
                  if (lat < -11.0 || lat > 5.0 || lng < -59.0 || lng > -40.0) return false;
                  
                  return true;
              }
              
              return false;
          }).map(estacao => (
            <Marker 
              key={estacao.codigo} 
              position={[estacao.latitude, estacao.longitude]}
              icon={getMarkerIcon(estacao.anomalia, estacao.statusCota)}
            >
              <Popup className="custom-popup" closeButton={true}>
                <div className="w-[360px] bg-white flex flex-col relative">
                  {/* Close button that looks native but is inside our custom container */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      const leafletClose = (e.target as any).closest('.leaflet-popup').querySelector('.leaflet-popup-close-button');
                      if (leafletClose) leafletClose.click();
                    }}
                    className="absolute top-2.5 right-2.5 text-slate-600 hover:text-black z-10 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  {/* Header */}
                  <div className={`${(estacao.anomalia || '').includes('POSITIVA') ? 'bg-[#b3d4ff]' : (estacao.anomalia || '').includes('NEGATIVA') ? 'bg-[#feb2b2]' : 'bg-[#9ae6b4]'} px-4 py-3 flex items-center justify-between rounded-t-lg`}>
                    <div className="flex items-center gap-2 text-slate-800">
                      <div 
                        className="w-7 h-7 rounded-md flex items-center justify-center shadow-sm p-1"
                        style={{ backgroundColor: getIconProps(estacao.anomalia || '', estacao.statusCota).color }}
                        dangerouslySetInnerHTML={{ __html: getIconProps(estacao.anomalia || '', estacao.statusCota).svg }}
                      />
                      <span className="font-bold text-[15px]">{activeProduct.startsWith('niveis') ? 'Nível do rio' : 'Estação Hidrometeorológica'}</span>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="text-xs text-slate-600 mb-3 border-b border-slate-100 pb-3">
                      Estação: <span className="text-slate-800 font-medium">{estacao.nome}</span> <span className="text-slate-400">({estacao.codigo})</span>
                    </div>
                    
                    <div className="flex gap-4 items-stretch">
                      {activeProduct.startsWith('niveis') ? (
                        <>
                          {/* Cota */}
                          <div className="flex flex-col justify-center min-w-[80px]">
                            <div className="flex items-center gap-1 text-[#276749] font-bold text-xs mb-1">
                              <Waves className="w-4 h-4" /> Nível do rio
                            </div>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-[28px] font-black text-slate-800">{(estacao.cotaUltimaMedicao / 100).toFixed(2)}</span>
                              <span className="text-slate-500 font-medium text-sm">m</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 flex gap-3 border-l border-slate-100 pl-4 py-1">
                            {/* Valores com fallback robusto para campos dinâmicos da API Sipam */}
                            {(() => {
                              const minDia = estacao.cotaDataAtual?.minima ?? estacao.cotaMinimaDia ?? estacao.cota_minima_dia ?? estacao.cotaUltimaMedicao;
                              const maxDia = estacao.cotaDataAtual?.maxima ?? estacao.cotaMaximaDia ?? estacao.cota_maxima_dia ?? estacao.cotaUltimaMedicao;
                              const medDia = estacao.cotaDataAtual?.media ?? estacao.cotaMediaDia ?? estacao.cota_media_dia ?? estacao.cotaUltimaMedicao;

                              const minMes = estacao.cotaRegua?.cotaMinima ?? estacao.minima_historica_mes ?? estacao.minima_mes ?? estacao.cotaMinimaMes ?? estacao.cotaUltimaMedicao;
                              const maxMes = estacao.cotaRegua?.cotaMaxima ?? estacao.maxima_historica_mes ?? estacao.maxima_mes ?? estacao.cotaMaximaMes ?? estacao.cotaUltimaMedicao;
                              const medMes = estacao.cotaRegua?.cotaMedia ?? estacao.media_historica_mes ?? estacao.media_mes ?? estacao.cotaMediaMes ?? estacao.cotaUltimaMedicao;

                              return (
                                <>
                                  {/* Histórico do Dia */}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1 text-[#276749] font-bold text-[10px] mb-2 leading-tight h-6">
                                      <Clock className="w-3 h-3 flex-shrink-0" /> Histórico do<br/>dia (m)
                                    </div>
                                    <div className="flex justify-between text-[10px] mb-1">
                                      <span className="text-slate-500">Mínima</span>
                                      <span className="font-bold text-slate-700">{minDia != null ? (minDia / 100).toFixed(2) : '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] mb-1">
                                      <span className="text-slate-500">Máxima</span>
                                      <span className="font-bold text-slate-700">{maxDia != null ? (maxDia / 100).toFixed(2) : '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-slate-500">Média</span>
                                      <span className="font-bold text-slate-700">{medDia != null ? (medDia / 100).toFixed(2) : '-'}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Histórico do Mês */}
                                  <div className="flex-1 border-l border-slate-100 pl-3">
                                    <div className="flex items-center gap-1 text-[#276749] font-bold text-[10px] mb-2 leading-tight h-6">
                                      <Calendar className="w-3 h-3 flex-shrink-0" /> Histórico de<br/>AGOSTO (m)
                                    </div>
                                    <div className="flex justify-between text-[10px] mb-1">
                                      <span className="text-slate-500">Mínima</span>
                                      <span className="font-bold text-slate-700">{minMes != null ? (minMes / 100).toFixed(2) : '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] mb-1">
                                      <span className="text-slate-500">Máxima</span>
                                      <span className="font-bold text-slate-700">{maxMes != null ? (maxMes / 100).toFixed(2) : '-'}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                      <span className="text-slate-500">Média</span>
                                      <span className="font-bold text-slate-700">{medMes != null ? (medMes / 100).toFixed(2) : '-'}</span>
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col justify-center items-center w-full py-5 bg-blue-50/70 rounded-xl border border-blue-100 my-1">
                          <CloudRain className="w-7 h-7 text-blue-500 mb-2 opacity-80" />
                          <span className="text-xs font-semibold text-slate-600 text-center px-4 leading-relaxed">
                            Clique em <strong className="text-blue-700">Gráfico</strong> ou <strong className="text-blue-700">Perfil</strong> para gerar a estatística e o histórico pluviométrico desta estação.
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center text-[10px] text-slate-500 mt-5 mb-3">
                      Data da medição: {new Date(estacao.dataHoraUltimaMedicao).toLocaleString('pt-BR')}h
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {}}
                        className="flex-1 py-1.5 border border-[#276749] text-[#276749] hover:bg-[#f0fff4] rounded-lg text-xs font-semibold transition-colors"
                      >
                        Gráfico
                      </button>
                      <button 
                        onClick={() => {}}
                        className="flex-1 py-1.5 border border-[#276749] text-[#276749] hover:bg-[#f0fff4] rounded-lg text-xs font-semibold transition-colors"
                      >
                        Perfil
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Render Reservatórios / Hidrelétricas */}
          {activeProduct === 'reservatorios' && hidreletricas.map(uhe => (
            <Marker 
              key={uhe.codigo} 
              position={[uhe.latitude, uhe.longitude]}
              icon={getReservatorioIcon(uhe.tipo)}
            >
              <Popup className="rounded-xl shadow-xl border-0">
                <div className="p-1 min-w-[280px]">
                  <h3 className="font-bold text-lg text-slate-800 mb-1">{uhe.nome}</h3>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold uppercase">{uhe.tipo.trim()}</span>
                  </div>
                  <div className="text-xs text-slate-600 mb-4 flex flex-col gap-1.5">
                    <span className="flex justify-between border-b pb-1"><strong>Nível Montante:</strong> <span>{uhe.nivelMontante} m</span></span>
                    <span className="flex justify-between border-b pb-1"><strong>Volume Útil:</strong> <span className="font-bold text-blue-600">{uhe.volumeUtil}%</span></span>
                    <span className="flex justify-between border-b pb-1"><strong>Vazão Afluente:</strong> <span>{uhe.vazaoAfluente} m³/s</span></span>
                    <span className="flex justify-between pb-1"><strong>Vazão Defluente:</strong> <span>{uhe.vazaoDefluente} m³/s</span></span>
                    <span className="mt-2 text-[10px] text-slate-400">Atualizado em: {new Date(uhe.dataUltimaAtualizacao).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
          {/* GeoJSON para Chuva */}
          {activeProduct === 'chuva' && baciasGeoJson && (
            <GeoJSON 
              data={baciasGeoJson} 
              onEachFeature={onBaciaClick}
              style={{
                color: '#475569',
                weight: 1,
                fillColor: 'transparent',
                fillOpacity: 0.1
              }}
            />
          )}
          
          {/* Popup da Sub-bacia */}
          {activeProduct === 'chuva' && selectedBacia && (
            <Popup 
              position={selectedBacia.latlng}
              eventHandlers={{ remove: () => setSelectedBacia(null) }}
              className="custom-popup"
            >
              <div className="w-[360px] bg-white flex flex-col relative">
                {/* Header idêntico ao Sipam */}
                <div className="bg-[#4a8559] px-4 py-3 flex items-center justify-between rounded-t-lg">
                  <div className="flex items-center gap-2 text-white">
                    <CloudRain className="w-5 h-5" />
                    <span className="font-bold text-[15px]">Chuva em Bacia Hidrográfica</span>
                  </div>
                </div>
                
                <div className="space-y-1 mb-3 text-sm px-4 pt-4">
                  <div>Bacia: <span className="font-bold">{selectedBacia.feature.properties.nome_bacia || selectedBacia.feature.properties.nombacia || 'N/A'}</span></div>
                  <div>Código: <span className="font-bold">{selectedBacia.feature.properties.codigo_sub_bacia || selectedBacia.feature.properties.nunivotto || 'N/A'}</span></div>
                  <div>Rio Principal: <span className="font-bold">{selectedBacia.feature.properties.regiao37 || selectedBacia.feature.properties.nomrio || 'N/A'}</span></div>
                  {selectedBacia.feature.properties.nuareacont && <div>Área Sub-bacia (km²): <span className="font-bold">{selectedBacia.feature.properties.nuareacont}</span></div>}
                </div>
                
                <div className="p-4 pt-0">
                  <div className="flex gap-4">
                    <div className="flex flex-col flex-1 justify-center">
                      <div className="flex items-center gap-1 text-[#4a8559] font-bold text-xs mb-1">
                        <Waves className="w-4 h-4" /> Precipitação (mm)
                      </div>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-bold text-slate-800">{estimador === 'NOAA' ? 'CPC:' : 'INPE:'}</span>
                        <span className="text-[28px] font-black text-slate-800">
                          {baciaChuvaData ? baciaChuvaData.precipitacaoCpc?.toFixed(1) : <Loader2 className="w-6 h-6 animate-spin text-slate-400" />}
                        </span>
                        <span className="text-sm font-semibold text-slate-500">mm</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col border-l border-slate-100 pl-4 py-1">
                      <div className="flex items-center gap-1 text-[#4a8559] font-bold text-[10px] mb-2 leading-tight">
                        <CloudRain className="w-3 h-3 flex-shrink-0" /> Precipitação<br/>Acumulados (mm)
                      </div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-500 font-bold">Acumulado 7 dias:</span>
                        <span className="font-bold text-slate-700 text-xs">{baciaChuvaData ? baciaChuvaData.acumulado_7?.toFixed(1) : '-'}</span>
                      </div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-slate-500 font-bold">Acumulado 15 dias:</span>
                        <span className="font-bold text-slate-700 text-xs">{baciaChuvaData ? baciaChuvaData.acumulado_15?.toFixed(1) : '-'}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-500 font-bold">Acumulado 30 dias:</span>
                        <span className="font-bold text-slate-700 text-xs">{baciaChuvaData ? baciaChuvaData.acumulado_30?.toFixed(1) : '-'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center text-[10px] text-slate-500 mt-5 mb-3">
                    Data: {chuvaDate.split('-').reverse().join('/')}
                  </div>
                  
                    <button 
                      onClick={() => {}}
                    disabled={!baciaChuvaData}
                    className="w-full py-2 border border-[#4a8559] text-[#4a8559] hover:bg-[#f0fff4] rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    Gráfico
                  </button>
                </div>
              </div>
            </Popup>
          )}

        {/* WMS Layers */}
        {(activeProduct === 'chuva' || (activeProduct === 'chuva_bacia' && chuvaViewType === 'GRADE')) && (
          (() => {
            const [ano, mes, dia] = chuvaDate.split('-');
            const viewparams = `dia:${dia};mes:${mes};ano:${ano}`;
            const wmsLayer = estimador === 'NOAA' ? 'sipam:cpc_grade' : 'sipam:merge_grade';
            
            return (
              <WMSTileLayer
                key={`${chuvaDate}-${chuvaViewType}-${estimador}`}
                url={`http://127.0.0.1:8000/api/wms?viewparams=${viewparams}`}
                layers={wmsLayer}
                format="image/png"
                transparent={true}
                crs={L.CRS.EPSG4326}
                zIndex={1000}
                opacity={chuvaOpacity / 100}
              />
            );
          })()
        )}

        </MapContainer>
        </div>        {/* LEGEND WAS MOVED TO THE SIDEBAR */}

      </main>
    </div>
  );
}
