import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
const stations = [
  { name: 'Óbidos', code: '17050001', river: 'Rio Amazonas' },
  { name: 'Almeirim', code: '18390000', river: 'Rio Amazonas' },
  { name: 'Santarém', code: '17900000', river: 'Rio Tapajós' },
  { name: 'Itaituba', code: '17730000', river: 'Rio Tapajós' },
  { name: 'Marabá', code: '29050000', river: 'Rio Tocantins' },
  { name: 'Tucuruí', code: '29680090', river: 'Rio Tocantins' },
  { name: 'Oriximiná', code: '16900000', river: 'Rio Trombetas' },
  { name: 'Estirão da Angélica', code: '16500000', river: 'Rio Trombetas' },
  { name: 'Porto de Moz', code: '18950003', river: 'Rio Xingu' },
  { name: 'Vitória do Xingu', code: '18936000', river: 'Rio Xingu' }
];

const targetYears = ['2022', '2023', '2024', '2025', '2026'];

interface TableRowData {
  station: typeof stations[0];
  data: Record<string, number | null>;
  maxYear: string | null;
  minYear: string | null;
  currentLevel: number | null;
  monthMin: number | null;
  monthMax: number | null;
  monthMean: number | null;
  anomalyText: string;
  anomalyBg: string;
  anomalyFg: string;
}

function getAnomalyTheme(value: number, mean: number, sd: number) {
  if (sd === 0) return { text: 'Sem anomalia', bg: '#f8fafc', fg: '#475569' };
  const z = (value - mean) / sd;
  
  if (z >= 3) return { text: 'Anomalia Extrema Positiva', bg: '#7dd3fc', fg: '#075985' };
  if (z >= 2) return { text: 'Anomalia Severa Positiva', bg: '#bae6fd', fg: '#0369a1' };
  if (z >= 1.5) return { text: 'Anomalia Moderada Positiva', bg: '#e0f2fe', fg: '#0284c7' };
  if (z >= 1) return { text: 'Anomalia Leve Positiva', bg: '#f0f9ff', fg: '#0369a1' };
  
  if (z <= -3) return { text: 'Anomalia Extrema Negativa', bg: '#fca5a5', fg: '#991b1b' };
  if (z <= -2) return { text: 'Anomalia Severa Negativa', bg: '#fecaca', fg: '#b91c1c' };
  if (z <= -1.5) return { text: 'Anomalia Moderada Negativa', bg: '#fee2e2', fg: '#dc2626' };
  if (z <= -1) return { text: 'Anomalia Leve Negativa', bg: '#fef2f2', fg: '#ef4444' };
  
  return { text: 'Sem anomalia', bg: '#f8fafc', fg: '#475569' };
}

const ComparativosTab: React.FC = () => {
  const [subTab, setSubTab] = useState<'tabela' | 'resumo'>('resumo');
  const [targetDay, setTargetDay] = useState('28');
  const [targetMonth, setTargetMonth] = useState('09');
  const [tableData, setTableData] = useState<TableRowData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const targetMMDD = `${targetMonth}-${targetDay}`;
      const lastYear = targetYears[targetYears.length - 1];
      
      const newTableData: TableRowData[] = [];

      await Promise.all(stations.map(async (station) => {
        try {
          const snapshot = await getDocs(collection(db, `stations/${station.code}/yearly_readings`));
          
          const valuesByYear: Record<string, number> = {};
          const targetDayValues: number[] = [];
          const monthValuesList: number[] = [];
          
          snapshot.forEach(doc => {
             const year = doc.id;
             const readings = doc.data().readings || {};
             
             const val = readings[targetMMDD];
             if (val !== undefined && val !== null) {
               targetDayValues.push(val);
               if (targetYears.includes(year)) {
                 valuesByYear[year] = val;
               }
             }
             
             Object.keys(readings).forEach(md => {
               if (md.startsWith(targetMonth + '-')) {
                 const v = readings[md];
                 if (v !== undefined && v !== null) {
                   monthValuesList.push(v);
                 }
               }
             });
          });
          
          let estatisticasMedia: number | null = null;
          let estatisticasSD = 0;
          
          if (targetDayValues.length > 0) {
             const sum = targetDayValues.reduce((a,b)=>a+b, 0);
             estatisticasMedia = sum / targetDayValues.length;
             let varSum = 0;
             for (const v of targetDayValues) varSum += Math.pow(v - estatisticasMedia, 2);
             estatisticasSD = Math.sqrt(varSum / targetDayValues.length);
          }
          
          const rowData: Record<string, number | null> = {};
          let maxVal = -Infinity;
          let minVal = Infinity;
          let maxY: string | null = null;
          let minY: string | null = null;

          targetYears.forEach(y => {
            if (valuesByYear[y] !== undefined) {
              const val = valuesByYear[y];
              rowData[y] = val;
              if (val > maxVal) { maxVal = val; maxY = y; }
              if (val < minVal) { minVal = val; minY = y; }
            } else {
              rowData[y] = null;
            }
          });

          let validCount = 0;
          for (const y of targetYears) {
             if (rowData[y] !== null) validCount++;
          }
          if (validCount < 2) {
            maxY = null;
            minY = null;
          }

          let monthMin = null;
          let monthMax = null;
          if (monthValuesList.length > 0) {
             monthMin = Math.min(...monthValuesList);
             monthMax = Math.max(...monthValuesList);
          }

          const currentLevel = rowData[lastYear] ?? null;
          let anomaly = { text: 'Sem dados', bg: '#f9fafb', fg: '#9ca3af' };
          if (currentLevel !== null && estatisticasMedia !== null) {
             anomaly = getAnomalyTheme(currentLevel, estatisticasMedia, estatisticasSD);
          }

          newTableData.push({
            station,
            data: rowData,
            maxYear: maxY,
            minYear: minY,
            currentLevel,
            monthMin,
            monthMax,
            monthMean: estatisticasMedia,
            anomalyText: anomaly.text,
            anomalyBg: anomaly.bg,
            anomalyFg: anomaly.fg
          });
          
        } catch (err) {
          console.error(`Error loading ${station.name}:`, err);
          const emptyRow: Record<string, null> = {};
          targetYears.forEach(y => emptyRow[y] = null);
          newTableData.push({ 
            station, data: emptyRow, maxYear: null, minYear: null,
            currentLevel: null, monthMin: null, monthMax: null, monthMean: null,
            anomalyText: 'Erro', anomalyBg: '#fef2f2', anomalyFg: '#ef4444'
          });
        }
      }));

      // Maintain predefined order by Rio and Name
      newTableData.sort((a, b) => {
        const orderMap: Record<string, number> = {
          'Rio Amazonas': 1,
          'Rio Tapajós': 2,
          'Rio Tocantins': 3,
          'Rio Trombetas': 4,
          'Rio Xingu': 5
        };
        const orderA = orderMap[a.station.river] || 99;
        const orderB = orderMap[b.station.river] || 99;
        return orderA - orderB || a.station.name.localeCompare(b.station.name);
      });

      setTableData(newTableData);
      setLoading(false);
    };

    fetchData();
  }, [targetDay, targetMonth]);

  const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const currentMonthName = monthNames[parseInt(targetMonth) - 1];
  const lastYear = targetYears[targetYears.length - 1];

  // Group by river for the Resumo view
  const groupedByRiver = tableData.reduce((acc, row) => {
    if (!acc[row.station.river]) acc[row.station.river] = [];
    acc[row.station.river].push(row);
    return acc;
  }, {} as Record<string, TableRowData[]>);

  return (
    <div className="tab-content fade-in">
      <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="page-title">Comparativos</h2>
          <p className="page-subtitle">Análise das cotas para uma data específica.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-panel)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button 
             onClick={() => setSubTab('resumo')}
             style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: subTab === 'resumo' ? '#1b5e20' : 'transparent', color: subTab === 'resumo' ? '#fff' : 'var(--text-main)', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}>
             Resumo
          </button>
          <button 
             onClick={() => setSubTab('tabela')}
             style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: subTab === 'tabela' ? '#1b5e20' : 'transparent', color: subTab === 'tabela' ? '#fff' : 'var(--text-main)', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }}>
             Matriz Anual
          </button>
        </div>

        <div className="date-picker-container" style={{ background: 'var(--bg-panel)', padding: '12px 20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-bright)' }}>Data:</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select 
              value={targetDay} 
              onChange={(e) => setTargetDay(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-bright)', fontFamily: 'inherit', outline: 'none' }}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                const day = d.toString().padStart(2, '0');
                return <option key={day} value={day}>{day}</option>;
              })}
            </select>
            <span style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', fontWeight: 600 }}>/</span>
            <select 
              value={targetMonth} 
              onChange={(e) => setTargetMonth(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-bright)', fontFamily: 'inherit', outline: 'none' }}
            >
              <option value="01">Jan</option>
              <option value="02">Fev</option>
              <option value="03">Mar</option>
              <option value="04">Abr</option>
              <option value="05">Mai</option>
              <option value="06">Jun</option>
              <option value="07">Jul</option>
              <option value="08">Ago</option>
              <option value="09">Set</option>
              <option value="10">Out</option>
              <option value="11">Nov</option>
              <option value="12">Dez</option>
            </select>
          </div>
        </div>
      </div>

      {subTab === 'resumo' ? (
        <div style={{ marginTop: '16px', background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          {loading ? (
             <div className="loading-state" style={{ padding: '60px' }}>Carregando dados das estações...</div>
          ) : (
            <>
              <div style={{ backgroundColor: '#f1f8e9', padding: '8px', textAlign: 'center', borderBottom: '2px solid #fff' }}>
                <h2 style={{ color: '#1b5e20', margin: 0, fontSize: '1.1rem' }}>Resumo - {currentMonthName}{lastYear}</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#1b5e20', color: '#fff' }}>
                      <th style={{ padding: '8px', borderRight: '1px solid #fff', width: '20%' }}>Rios</th>
                      <th style={{ padding: '8px', borderRight: '1px solid #fff', width: '40%' }}>Estação</th>
                      <th style={{ padding: '8px', width: '40%' }}>
                        Nível do Rio (m)<br/>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>MIN {'<'} MÉDIA {'<'} MÁX ({currentMonthName})</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedByRiver).map(([river, rows]) => (
                      <React.Fragment key={river}>
                        {rows.map((row, index) => (
                          <tr key={row.station.code} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            {index === 0 && (
                              <td rowSpan={rows.length} style={{ borderRight: '1px solid #e5e7eb', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold', backgroundColor: '#fff', color: '#4b5563', fontSize: '0.9rem' }}>
                                {river}
                              </td>
                            )}
                            <td style={{ backgroundColor: row.anomalyBg, textAlign: 'center', padding: '6px', borderRight: '1px solid #e5e7eb' }}>
                              <div style={{ fontWeight: 'bold', color: row.anomalyFg, fontSize: '0.95rem' }}>
                                {row.station.name} <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>[{row.station.code}]</span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: row.anomalyFg, marginTop: '2px' }}>({row.anomalyText})</div>
                            </td>
                            <td style={{ textAlign: 'center', backgroundColor: '#fff', padding: '6px' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: '#1b5e20' }}>
                                {row.currentLevel !== null ? (row.currentLevel / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>
                                {row.monthMin !== null ? (row.monthMin / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'} {' < '}
                                {row.monthMean !== null ? (row.monthMean / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'} {' < '}
                                {row.monthMax !== null ? (row.monthMax / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ textAlign: 'center', padding: '10px', fontWeight: 'bold', color: '#1f2937', fontSize: '0.85rem' }}>
                Dados observados em {targetDay} DE {currentMonthName}
              </div>
              <div style={{ fontSize: '0.75rem', padding: '8px 16px', borderTop: '1px solid #e5e7eb', color: '#4b5563' }}>
                * Anomalias positivas indicam níveis do rio acima do padrão de referência, enquanto anomalias negativas indicam níveis abaixo desse padrão.
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="comparativos-container" style={{ marginTop: '24px', background: 'var(--bg-panel)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          {loading ? (
            <div className="loading-state" style={{ padding: '60px' }}>Carregando dados das estações...</div>
          ) : (
            <div className="table-responsive" style={{ overflowX: 'auto' }}>
              <table className="estatisticas-table" style={{ width: '100%', minWidth: '800px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '16px 20px', fontSize: '0.95rem', color: 'var(--text-main)' }}>Rio</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.95rem' }}>Estação</th>
                    {targetYears.map(year => (
                      <th key={year} style={{ padding: '16px 20px', fontSize: '0.95rem', textAlign: 'center' }}>
                        {year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => {
                    let isFirstOfRiver = false;
                    let riverRowSpan = 1;
                    
                    if (idx === 0 || tableData[idx - 1].station.river !== row.station.river) {
                      isFirstOfRiver = true;
                      for (let j = idx + 1; j < tableData.length; j++) {
                        if (tableData[j].station.river === row.station.river) {
                          riverRowSpan++;
                        } else {
                          break;
                        }
                      }
                    }

                    return (
                      <tr key={idx}>
                        {isFirstOfRiver && (
                          <td 
                            rowSpan={riverRowSpan} 
                            style={{ 
                              padding: '16px 20px', 
                              color: 'var(--text-main)', 
                              borderBottom: '1px solid var(--border-color)',
                              verticalAlign: 'middle',
                              fontWeight: 600,
                              backgroundColor: 'var(--bg-main)'
                            }}
                          >
                            {row.station.river}
                          </td>
                        )}
                        <td style={{ padding: '16px 20px', fontWeight: 600, borderBottom: '1px solid var(--border-color)' }}>
                          {row.station.name}
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-main)', marginTop: '4px', fontWeight: 'normal' }}>Cod: {row.station.code}</div>
                        </td>
                      {targetYears.map(year => {
                        const val = row.data[year];
                        let bgColor = 'transparent';
                        let color = 'inherit';
                        let fontWeight = 'normal';
                        
                        if (val !== null) {
                          if (year === row.maxYear) {
                            bgColor = 'rgba(14, 165, 233, 0.1)'; 
                            color = '#0284c7'; 
                            fontWeight = '700';
                          } else if (year === row.minYear) {
                            bgColor = 'rgba(239, 68, 68, 0.1)'; 
                            color = '#dc2626'; 
                            fontWeight = '700';
                          }
                        }

                        return (
                          <td 
                            key={year} 
                            style={{ 
                              padding: '16px 20px', 
                              textAlign: 'center', 
                              borderBottom: '1px solid var(--border-color)',
                              backgroundColor: bgColor,
                              color: color,
                              fontWeight: fontWeight,
                              transition: 'background-color 0.2s'
                            }}
                          >
                            {val !== null ? `${val.toFixed(1)} cm` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                  })}
                </tbody>
              </table>
              {!loading && (
                <div style={{ display: 'flex', gap: '24px', marginTop: '16px', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(14, 165, 233, 0.1)', border: '1px solid rgba(14, 165, 233, 0.3)' }}></div>
                    Maior cota do período
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}></div>
                    Menor cota do período
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComparativosTab;
