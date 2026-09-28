import React, { useState } from 'react';
import EstatisticaChart from './EstatisticaChart';

const stations = [
  { nome: 'Santarém', codigo: '17900000', rio: 'Rio Tapajós', defaultColor: '#45A29E' },
  { nome: 'Itaituba', codigo: '17730000', rio: 'Rio Tapajós', defaultColor: '#66FCF1' },
  { nome: 'Óbidos', codigo: '17050001', rio: 'Rio Amazonas', defaultColor: '#4A90E2' },
  { nome: 'Almeirim', codigo: '18390000', rio: 'Rio Amazonas', defaultColor: '#8E44AD' },
  { nome: 'Marabá', codigo: '29050000', rio: 'Rio Tocantins', defaultColor: '#F5A623' },
  { nome: 'Porto de Moz', codigo: '18950003', rio: 'Rio Xingu', defaultColor: '#D0021B' },
  { nome: 'Oriximiná', codigo: '16900000', rio: 'Rio Trombetas', defaultColor: '#9013FE' },
  { nome: 'Estirão da Angélica', codigo: '16500000', rio: 'Rio Trombetas', defaultColor: '#F5A623' },
  { nome: 'Vitória do Xingu', codigo: '18936000', rio: 'Rio Xingu', defaultColor: '#4A90E2' },
  { nome: 'Tucuruí', codigo: '29680090', rio: 'Rio Tocantins', defaultColor: '#50E3C2' }
];

const EstatisticasTab: React.FC = () => {
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
          <h2 className="page-title">Estatísticas</h2>
          <p className="page-subtitle">Consolidação de Média Mensal e Desvio Padrão baseada na série histórica.</p>
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
              <p>Selecione ao menos uma estação ao lado para visualizar os gráficos e tabelas.</p>
            </div>
          ) : (
            stations
              .filter(s => selectedStations.includes(s.codigo))
              .map(station => (
                <EstatisticaChart 
                  key={station.codigo}
                  name={station.nome}
                  code={station.codigo}
                  river={station.rio}
                  csvPath={`/Rios/${station.rio}/${station.nome} (${station.codigo})/estatisticas.csv`}
                  defaultColor={station.defaultColor}
                />
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default EstatisticasTab;
