import React, { useState } from 'react';
import StationChart from './StationChart';

const stations = [
  { name: 'Óbidos', code: '17050001', river: 'Rio Amazonas', defaultColor: '#4A90E2' },
  { name: 'Almeirim', code: '18390000', river: 'Rio Amazonas', defaultColor: '#8E44AD' },
  { name: 'Santarém', code: '17900000', river: 'Rio Tapajós', defaultColor: '#45A29E' },
  { name: 'Itaituba', code: '17730000', river: 'Rio Tapajós', defaultColor: '#66FCF1' },
  { name: 'Marabá', code: '29050000', river: 'Rio Tocantins', defaultColor: '#F5A623' },
  { name: 'Tucuruí', code: '29680090', river: 'Rio Tocantins', defaultColor: '#50E3C2' },
  { name: 'Oriximiná', code: '16900000', river: 'Rio Trombetas', defaultColor: '#9013FE' },
  { name: 'Estirão da Angélica', code: '16500000', river: 'Rio Trombetas', defaultColor: '#F5A623' },
  { name: 'Porto de Moz', code: '18950003', river: 'Rio Xingu', defaultColor: '#D0021B' },
  { name: 'Vitória do Xingu', code: '18936000', river: 'Rio Xingu', defaultColor: '#4A90E2' }
];

const SerieHistoricaTab: React.FC = () => {
  const [selectedStations, setSelectedStations] = useState<string[]>([stations[0].code]);

  const toggleStation = (codigo: string) => {
    setSelectedStations(prev => 
      prev.includes(codigo) 
        ? prev.filter(c => c !== codigo)
        : [...prev, codigo]
    );
  };

  return (
    <div className="tab-content fade-in">
      <div className="tab-header">
        <div>
          <h2 className="page-title">Série Histórica</h2>
          <p className="page-subtitle">Acompanhamento completo das cotas desde o início das operações de cada estação.</p>
        </div>
      </div>

      <div className="serie-anual-layout">
        <div className="stations-sidebar card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-bright)', marginBottom: '16px' }}>Estações</h3>
          
          <div className="checkbox-list">
            {stations.map(station => (
              <label key={station.code} className="checkbox-item">
                <input 
                  type="checkbox" 
                  checked={selectedStations.includes(station.code)}
                  onChange={() => toggleStation(station.code)}
                />
                <div className="checkbox-text">
                  <span className="checkbox-title">{station.name}</span>
                  <span className="checkbox-desc">{station.river}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="charts-area">
          {selectedStations.length === 0 ? (
            <div className="empty-state">
              <p>Selecione ao menos uma estação ao lado para visualizar os gráficos.</p>
            </div>
          ) : (
            stations
              .filter(s => selectedStations.includes(s.code))
              .map(station => (
                <StationChart
                  key={station.code}
                  name={station.name}
                  code={station.code}
                  river={station.river}
                  csvPath={`/Rios/${station.river}/${station.name} (${station.code})/serie_historica.csv`}
                  defaultColor={station.defaultColor}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SerieHistoricaTab;
