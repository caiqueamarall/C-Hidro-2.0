import React, { useState } from 'react';
import AnualChart from './AnualChart';

const stations = [
  { nome: 'Óbidos', codigo: '17050001', rio: 'Rio Amazonas' },
  { nome: 'Almeirim', codigo: '18390000', rio: 'Rio Amazonas' },
  { nome: 'Santarém', codigo: '17900000', rio: 'Rio Tapajós' },
  { nome: 'Itaituba', codigo: '17730000', rio: 'Rio Tapajós' },
  { nome: 'Marabá', codigo: '29050000', rio: 'Rio Tocantins' },
  { nome: 'Tucuruí', codigo: '29680090', rio: 'Rio Tocantins' },
  { nome: 'Oriximiná', codigo: '16900000', rio: 'Rio Trombetas' },
  { nome: 'Estirão da Angélica', codigo: '16500000', rio: 'Rio Trombetas' },
  { nome: 'Porto de Moz', codigo: '18950003', rio: 'Rio Xingu' },
  { nome: 'Vitória do Xingu', codigo: '18936000', rio: 'Rio Xingu' }
];

const SerieAnualTab: React.FC = () => {
  // Select first station by default
  const [selectedStations, setSelectedStations] = useState<string[]>([stations[0].codigo]);

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
          <h2 className="page-title">Série Anual</h2>
          <p className="page-subtitle">Comparativo de cotas ao longo dos meses para múltiplos anos.</p>
        </div>
      </div>
      
      <div className="serie-anual-layout">
        <div className="stations-sidebar card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-bright)', marginBottom: '16px' }}>Estações</h3>
          
          <div className="checkbox-list">
            {stations.map(station => (
              <label key={station.codigo} className="checkbox-item">
                <input 
                  type="checkbox" 
                  checked={selectedStations.includes(station.codigo)}
                  onChange={() => toggleStation(station.codigo)}
                />
                <div className="checkbox-text">
                  <span className="checkbox-title">{station.nome}</span>
                  <span className="checkbox-desc">{station.rio}</span>
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
              .filter(s => selectedStations.includes(s.codigo))
              .map(station => (
                <AnualChart 
                  key={station.codigo}
                  name={station.nome}
                  code={station.codigo}
                  river={station.rio}
                  csvPath={`/Rios/${station.rio}/${station.nome} (${station.codigo})/serie_historica.csv`}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SerieAnualTab;
