import re

input_path = r'd:\Projetos\Nivel dos Rios\SipamClone\src\App.tsx'
output_path = r'd:\Projetos\Nivel dos Rios\C-Hidro 2.0\src\components\VisaoGeralTab.tsx'

with open(input_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract imports
imports_raw = re.findall(r"(import\s+.*?;)", content, re.DOTALL)

# We need only the relevant ones for VisaoGeralTab
imports = """import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, Marker, Popup, ZoomControl, LayersControl, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CloudRain, Sun, Droplets, Info, Calendar, X, Waves, Clock, TrendingDown, Equal, TrendingUp, HelpCircle } from 'lucide-react';
"""

# Extract helper functions
helpers = re.search(r"(// Helper to map Z-Score.*?)(?=const products =)", content, re.DOTALL).group(1)

products = """const products = [
  { id: 'niveis_com4', label: 'Nível dos Rios Com4ºDN', icon: Droplets, active: true },
  { id: 'niveis_amazonia', label: 'Nível dos Rios Amazônia Legal', icon: Droplets, active: false },
  { id: 'chuva', label: 'Chuva (Bacia)', icon: CloudRain, active: false },
  { id: 'estiagem', label: 'Estiagem', icon: Sun, active: false }
];

const HIDRELETRICAS = [
  { id: 'tucurui', nome: 'UHE Tucuruí', lat: -3.8333, lng: -49.6500, tipo: 'reservatorio' },
  { id: 'bmo', nome: 'UHE Belo Monte', lat: -3.1197, lng: -51.7803, tipo: 'reservatorio' },
  { id: 'st_antonio', nome: 'UHE Santo Antônio', lat: -8.8028, lng: -63.9511, tipo: 'reservatorio' },
  { id: 'jirau', nome: 'UHE Jirau', lat: -9.2611, lng: -64.6469, tipo: 'reservatorio' }
];

"""

# Extract KmzOverlay
kmz_overlay = re.search(r"(function KmzOverlay.*?return null;\n})", content, re.DOTALL).group(1)

component_start = """

export default function VisaoGeralTab() {
  const [activeProduct, setActiveProduct] = useState('niveis_com4');
  const [estacoes, setEstacoes] = useState<any[]>([]);
  const [hidreletricas, setHidreletricas] = useState<any[]>([]);
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
          setBaciaChuvaData(d);
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

    fetch(`http://localhost:8000/api/estacoes`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
      .then(res => res.json())
      .then(data => {
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
    <div className="flex h-[calc(100vh-60px)] w-full overflow-hidden bg-slate-50">
      <aside className="w-72 bg-white shadow-2xl z-20 flex flex-col h-full border-r border-slate-200">
"""

# Extract sidebar products list from SipamClone
sidebar = re.search(r"({activeTab === 'produtos' && \(\s*<div className=\"flex flex-col h-full overflow-hidden\">.*?</div>\s*\)\s*})", content, re.DOTALL).group(1)
sidebar = sidebar.replace("{activeTab === 'produtos' && (", "")
sidebar = sidebar[:sidebar.rfind(")}")]

# Extract map container from SipamClone
map_container = re.search(r"(<div style={{ display: activeTab === 'produtos' \? 'block' : 'none'.*?)<\/div>", content, re.DOTALL).group(1)
map_container = map_container.replace("display: activeTab === 'produtos' ? 'block' : 'none'", "display: 'block'")
map_container = map_container.replace("activeTab === 'produtos' && ['niveis_com4', 'niveis_amazonia']", "['niveis_com4', 'niveis_amazonia']")
# Fix the KmzOverlay url to use a string
map_container = map_container.replace("kmzFileUrl", "'/Com4DN.kmz'")
# Remove setProgStationId and setActiveTab logic
map_container = re.sub(r"onClick=\{\(\) => \{\s*setProgStationId\(estacao\.codigo\);\s*setActiveTab\('prognostico'\);[\s\S]*?\}\}", "onClick={() => {}}", map_container)
map_container = re.sub(r"onClick=\{\(\) => \{\s*setSelectedStationId\(estacao\.codigo\);\s*setActiveTab\('boletins'\);\s*\}\}", "onClick={() => {}}", map_container)


component_end = """      </aside>
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
        """ + map_container + """
      </main>
    </div>
  );
}
"""

final_code = imports + helpers + products + kmz_overlay + component_start + sidebar + component_end

with open(output_path, 'w', encoding='utf-8') as f:
    f.write(final_code)

print("VisaoGeralTab.tsx generated.")
