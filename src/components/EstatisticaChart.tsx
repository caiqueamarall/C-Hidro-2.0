import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Papa from 'papaparse';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
interface EstatisticaChartProps {
  name: string;
  code: string;
  river: string;
  csvPath: string;
  defaultColor?: string;
}

interface AnomalyStat {
  monthName: string;
  media: number;
  desvio_padrao: number;
  dp_pos_1: number;
  dp_pos_1_5: number;
  dp_pos_2: number;
  dp_pos_3: number;
  dp_neg_1: number;
  dp_neg_1_5: number;
  dp_neg_2: number;
  dp_neg_3: number;
  date?: string;
}

const EstatisticaChart: React.FC<EstatisticaChartProps> = ({ name, code, river, csvPath, defaultColor = '#45A29E' }) => {
  const [stats, setStats] = useState<AnomalyStat[]>([]);
  const [groupedData, setGroupedData] = useState<Record<string, [string, number | null][]>>({});
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [color, setColor] = useState(defaultColor);
  const [viewType, setViewType] = useState<'band' | 'absolute' | 'anomalies'>('band');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, `stations/${code}/yearly_readings`));
        
        const dataByYear: Record<string, [string, number | null][]> = {};
        const allReadings: Record<string, number[]> = {};
        
        snapshot.forEach(doc => {
          const year = doc.id;
          const readings = doc.data().readings || {};
          
          dataByYear[year] = [];
          
          const daysInMonths = [31,29,31,30,31,30,31,31,30,31,30,31];
          let lastValidCota = null;
          
          for(let m=1; m<=12; m++) {
            const mStr = String(m).padStart(2, '0');
            for(let d=1; d<=daysInMonths[m-1]; d++) {
               const dStr = String(d).padStart(2, '0');
               const md = `${mStr}-${dStr}`;
               const val = readings[md];
               
               if (val !== undefined && val !== null) {
                 dataByYear[year].push([`2024-${md}`, val]);
                 lastValidCota = val;
                 
                 const periodKey = d <= 15 ? `${mStr}-1` : `${mStr}-2`;
                 if (!allReadings[periodKey]) allReadings[periodKey] = [];
                 allReadings[periodKey].push(val);
               } else {
                 if (dataByYear[year].length > 0 && lastValidCota !== null) {
                   dataByYear[year].push([`2024-${md}`, null]);
                 }
               }
            }
          }
        });

        const computedStats: AnomalyStat[] = [];
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        for (let m=1; m<=12; m++) {
          const mStr = String(m).padStart(2, '0');
          for (let part=1; part<=2; part++) {
             const periodKey = `${mStr}-${part}`;
             const vals = allReadings[periodKey] || [];
             if (vals.length === 0) continue;
             
             const sum = vals.reduce((a,b)=>a+b, 0);
             const mean = sum / vals.length;
             let varSum = 0;
             for (const v of vals) varSum += Math.pow(v - mean, 2);
             const stdDev = Math.sqrt(varSum / vals.length);
             
             computedStats.push({
                monthName: `${part === 1 ? '1ª' : '2ª'} Q. ${monthNames[m-1]}`,
                media: mean,
                desvio_padrao: stdDev,
                dp_pos_1: mean + stdDev,
                dp_pos_1_5: mean + 1.5 * stdDev,
                dp_pos_2: mean + 2 * stdDev,
                dp_pos_3: mean + 3 * stdDev,
                dp_neg_1: mean - stdDev,
                dp_neg_1_5: mean - 1.5 * stdDev,
                dp_neg_2: mean - 2 * stdDev,
                dp_neg_3: mean - 3 * stdDev,
                date: `2024-${mStr}-${part === 1 ? '08' : '23'}`
             });
          }
        }

        setStats(computedStats);
        setGroupedData(dataByYear);
        const years = Object.keys(dataByYear).sort((a, b) => parseInt(b) - parseInt(a));
        setAvailableYears(years);
        if (years.length > 0) {
          setSelectedYears([years[0]]);
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(true);
        setLoading(false);
      }
    };

    fetchData();
  }, [csvPath]);

  const option = useMemo(() => {
    if (stats.length === 0) return {};

    const xAxisData = stats.map(s => s.monthName);

    let extendedStats: AnomalyStat[] = [];
    if (stats.length === 24) {
       extendedStats.push({ ...stats[0], date: '2024-01-01' });
       stats.forEach(s => extendedStats.push(s));
       extendedStats.push({ ...stats[23], date: '2024-12-31' });
    } else {
       extendedStats = stats;
    }

    const baseConfig = {
      grid: { top: 80, right: 20, bottom: 120, left: 50, containLabel: true },
      dataZoom: [
        { type: 'inside', start: 0, end: 100 },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 30,
          bottom: 55,
          borderColor: 'transparent',
          backgroundColor: 'rgba(241, 245, 249, 0.8)',
          fillerColor: 'rgba(2, 132, 199, 0.15)',
          handleStyle: { color: '#0284c7', borderColor: '#0284c7' }
        }
      ],
      yAxis: {
        type: 'value',
        name: 'Cota (cm)',
        nameTextStyle: { color: '#64748B', padding: [0, 0, 0, 10] },
        axisLine: { show: true, lineStyle: { color: '#CBD5E1' } },
        splitLine: { lineStyle: { color: '#F1F5F9' } },
        axisLabel: { color: '#64748B' },
        scale: true
      }
    };

    const currentYearStr = new Date().getFullYear().toString();

    if (viewType === 'band') {
      return {
        ...baseConfig,
        xAxis: {
          type: 'category',
          data: xAxisData,
          axisLine: { lineStyle: { color: '#CBD5E1' } },
          axisLabel: { color: '#64748B' },
          boundaryGap: true
        },
        tooltip: {
          trigger: 'axis',
          formatter: function (params: any) {
            const m = stats[params[0].dataIndex];
            if (!m) return '';
            return `
              <div style="font-weight:bold;margin-bottom:8px;">${m.monthName}</div>
              <div>Média: <span style="font-weight:600">${m.media.toFixed(2)} cm</span></div>
              <div>Desvio Padrão: <span style="font-weight:600">±${m.desvio_padrao.toFixed(2)} cm</span></div>
            `;
          }
        },
        legend: {
          data: ['Média Histórica', 'Desvio Padrão (Faixa)'],
          bottom: 0,
          textStyle: { color: '#64748B' }
        },
        series: [
          {
            name: 'Lower Bound',
            type: 'line',
            data: stats.map(s => Math.max(0, s.media - s.desvio_padrao)),
            step: 'middle',
            lineStyle: { opacity: 0 },
            stack: 'sd-band',
            symbol: 'none',
            tooltip: { show: false }
          },
          {
            name: 'Desvio Padrão (Faixa)',
            type: 'line',
            data: stats.map(s => s.desvio_padrao * 2),
            step: 'middle',
            lineStyle: { opacity: 0 },
            areaStyle: {
              color: color,
              opacity: 0.15
            },
            stack: 'sd-band',
            symbol: 'none'
          },
          {
            name: 'Média Histórica',
            type: 'line',
            data: stats.map(s => s.media),
            itemStyle: { color: color },
            lineStyle: { width: 3 },
            symbol: 'circle',
            symbolSize: 6
          }
        ]
      };
    } else if (viewType === 'absolute') {
      return {
        ...baseConfig,
        xAxis: {
          type: 'category',
          data: xAxisData,
          axisLine: { lineStyle: { color: '#CBD5E1' } },
          axisLabel: { color: '#64748B' },
          boundaryGap: true
        },
        tooltip: {
          trigger: 'axis',
          formatter: function (params: any) {
            const m = stats[params[0].dataIndex];
            if (!m) return '';
            return `
              <div style="font-weight:bold;margin-bottom:8px;">${m.monthName}</div>
              <div>Desvio Padrão Absoluto: <span style="font-weight:600;color:#F59E0B">${m.desvio_padrao.toFixed(2)} cm</span></div>
            `;
          }
        },
        legend: {
          data: ['Desvio Padrão'],
          bottom: 0,
          textStyle: { color: '#64748B' }
        },
        series: [
          {
            name: 'Desvio Padrão',
            type: 'line',
            step: 'middle',
            data: stats.map(s => s.desvio_padrao),
            itemStyle: { color: color },
            lineStyle: { opacity: 1, width: 2 },
            areaStyle: { color: color, opacity: 0.15 },
            symbol: 'circle',
            symbolSize: 6
          }
        ]
      };
    } else {
      // viewType === 'anomalies'
      
      const extraColors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'];
      const yearSeries = selectedYears.map((year, idx) => {
         const isFirst = idx === 0;
         const seriesColor = isFirst ? color : extraColors[(idx - 1) % extraColors.length];
         const name = year === currentYearStr ? `Ano Corrente (${year})` : `Ano ${year}`;
         return {
            name: name,
            type: 'line',
            data: groupedData[year] || [],
            itemStyle: { color: seriesColor },
            lineStyle: { width: isFirst ? 3 : 2 },
            symbol: 'none',
            connectNulls: false,
            z: 20 + idx
         };
      });

      const selectedNames = selectedYears.map(year => year === currentYearStr ? `Ano Corrente (${year})` : `Ano ${year}`);

      return {
        ...baseConfig,
        xAxis: {
          type: 'time',
          min: '2024-01-01',
          max: '2024-12-31',
          axisLine: { lineStyle: { color: '#CBD5E1' } },
          splitLine: { show: false },
          axisLabel: { 
            color: '#64748B',
            formatter: function (value: number) {
              const date = new Date(value);
              const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              return months[date.getUTCMonth()];
            }
          },
          splitNumber: 12,
          minInterval: 3600 * 24 * 1000 * 28,
          maxInterval: 3600 * 24 * 1000 * 32
        },
        tooltip: {
          trigger: 'axis',
          formatter: function (params: any) {
            let html = `<div style="font-weight:bold;margin-bottom:8px;border-bottom:1px solid #ccc;padding-bottom:4px;">${params[0].axisValueLabel || 'Data'}</div>`;
            html += `<div style="color:var(--text-main);font-size:0.85rem;line-height:1.6">`;
            
            selectedYears.forEach(year => {
               const name = year === currentYearStr ? `Ano Corrente (${year})` : `Ano ${year}`;
               const yearParam = params.find((p: any) => p.seriesName === name);
               if (yearParam) {
                  html += `<span style="color:${yearParam.color};font-weight:800;font-size:0.95rem;display:block;margin-bottom:4px">${name}: ${yearParam.value[1].toFixed(1)} cm</span>`;
               }
            });

            params.forEach((p: any) => {
               if (!selectedNames.includes(p.seriesName) && p.seriesName !== 'Média Histórica') {
                   html += `<div><span style="color:${p.color};font-weight:600">${p.seriesName}:</span> ${p.value[1].toFixed(1)} cm</div>`;
               }
            });
            
            const mediaParam = params.find((p: any) => p.seriesName === 'Média Histórica');
            if (mediaParam) {
               html += `<div style="color:#9CA3AF;font-weight:800;margin-top:4px">Média Histórica: ${mediaParam.value[1].toFixed(1)} cm</div>`;
            }
            
            html += `</div>`;
            return html;
          }
        },
        legend: {
          type: 'scroll',
          data: [
            ...selectedNames,
            'Média Histórica', 
            'Anomalia Extrema (+)', 'Anomalia Severa (+)', 'Anomalia Moderada (+)', 'Anomalia Leve (+)',
            'Anomalia Leve (-)', 'Anomalia Moderada (-)', 'Anomalia Severa (-)', 'Anomalia Extrema (-)'
          ],
          top: 0,
          width: '90%',
          textStyle: { color: '#64748B' }
        },
        series: [
          {
            name: 'Anomalia Leve (+)',
            type: 'line',
            data: extendedStats.map(s => [s.date, s.dp_pos_1]),
            itemStyle: { color: 'rgba(186, 230, 253, 1)' },
            lineStyle: { width: 1 },
            areaStyle: { origin: 'end', color: 'rgba(186, 230, 253, 0.25)' },
            symbol: 'none'
          },
          {
            name: 'Anomalia Moderada (+)',
            type: 'line',
            data: extendedStats.map(s => [s.date, s.dp_pos_1_5]),
            itemStyle: { color: 'rgba(125, 211, 252, 1)' },
            lineStyle: { width: 1 },
            areaStyle: { origin: 'end', color: 'rgba(125, 211, 252, 0.25)' },
            symbol: 'none'
          },
          {
            name: 'Anomalia Severa (+)',
            type: 'line',
            data: extendedStats.map(s => [s.date, s.dp_pos_2]),
            itemStyle: { color: 'rgba(56, 189, 248, 1)' },
            lineStyle: { width: 1 },
            areaStyle: { origin: 'end', color: 'rgba(56, 189, 248, 0.25)' },
            symbol: 'none'
          },
          {
            name: 'Anomalia Extrema (+)',
            type: 'line',
            data: extendedStats.map(s => [s.date, s.dp_pos_3]),
            itemStyle: { color: 'rgba(2, 132, 199, 1)' },
            lineStyle: { width: 1 },
            areaStyle: { origin: 'end', color: 'rgba(2, 132, 199, 0.25)' },
            symbol: 'none'
          },
          {
            name: 'Anomalia Leve (-)',
            type: 'line',
            data: extendedStats.map(s => [s.date, s.dp_neg_1]),
            itemStyle: { color: 'rgba(254, 202, 202, 1)' }, // red-200
            lineStyle: { width: 1 },
            areaStyle: { origin: 'start', color: 'rgba(254, 202, 202, 0.25)' },
            symbol: 'none'
          },
          {
            name: 'Anomalia Moderada (-)',
            type: 'line',
            data: extendedStats.map(s => [s.date, s.dp_neg_1_5]),
            itemStyle: { color: 'rgba(252, 165, 165, 1)' }, // red-300
            lineStyle: { width: 1 },
            areaStyle: { origin: 'start', color: 'rgba(252, 165, 165, 0.25)' },
            symbol: 'none'
          },
          {
            name: 'Anomalia Severa (-)',
            type: 'line',
            data: extendedStats.map(s => [s.date, s.dp_neg_2]),
            itemStyle: { color: 'rgba(248, 113, 113, 1)' }, // red-400
            lineStyle: { width: 1 },
            areaStyle: { origin: 'start', color: 'rgba(248, 113, 113, 0.25)' },
            symbol: 'none'
          },
          {
            name: 'Anomalia Extrema (-)',
            type: 'line',
            data: extendedStats.map(s => [s.date, s.dp_neg_3]),
            itemStyle: { color: 'rgba(239, 68, 68, 1)' }, // red-500
            lineStyle: { width: 1 },
            areaStyle: { origin: 'start', color: 'rgba(239, 68, 68, 0.25)' },
            symbol: 'none'
          },
          {
            name: 'Média Histórica',
            type: 'line',
            data: extendedStats.map(s => [s.date, s.media]),
            itemStyle: { color: '#9CA3AF' },
            lineStyle: { width: 2, type: 'dashed', color: '#9CA3AF' },
            symbol: 'none',
            z: 10
          },
          ...yearSeries
        ]
      };
    }
  }, [stats, groupedData, selectedYears, color, viewType]);

  return (
    <div className="card station-chart-container fade-in">
      <div className="chart-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
        <div className="chart-title" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <h3>{name}</h3>
            <p>{river} &bull; Código: {code}</p>
          </div>
          <label className="color-picker-label">
            Cor Principal:
            <input 
              type="color" 
              value={color} 
              onChange={(e) => setColor(e.target.value)}
              className="color-picker"
            />
          </label>
        </div>
        <div className="chart-controls" style={{ marginTop: '10px', marginBottom: '10px', width: '100%', justifyContent: 'center' }}>
          <div className="view-toggle">
            <button 
              className={`toggle-btn ${viewType === 'band' ? 'active' : ''}`}
              onClick={() => setViewType('band')}
            >
              Médias Históricas
            </button>
            <button 
              className={`toggle-btn ${viewType === 'absolute' ? 'active' : ''}`}
              onClick={() => setViewType('absolute')}
            >
              Desvio Padrão
            </button>
            <button 
              className={`toggle-btn ${viewType === 'anomalies' ? 'active' : ''}`}
              onClick={() => setViewType('anomalies')}
            >
              Anomalias
            </button>
          </div>
        </div>
      </div>

      <div className="chart-body" style={{ display: 'flex', flexDirection: 'row' }}>
        {viewType === 'anomalies' && availableYears.length > 0 && (
          <div style={{ width: '95px', flexShrink: 0, paddingRight: '8px', marginRight: '12px', borderRight: '1px solid var(--border-color)', overflowY: 'auto', maxHeight: '600px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '12px', textTransform: 'uppercase', lineHeight: 1.3, paddingRight: '4px' }}>
              Anos<br/>Disponíveis:
            </div>
            {availableYears.map(year => {
               const isSelected = selectedYears.includes(year);
               return (
                 <label key={year} style={{ display: 'block', padding: '6px 8px', marginBottom: '4px', borderRadius: '4px', cursor: 'pointer', background: isSelected ? 'rgba(69, 162, 158, 0.1)' : 'transparent', border: isSelected ? '1px solid rgba(69, 162, 158, 0.3)' : '1px solid var(--border-color)' }}>
                   <input 
                     type="checkbox" 
                     checked={isSelected}
                     onChange={() => {
                       setSelectedYears(prev => 
                         prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
                       );
                     }}
                     style={{ display: 'none' }}
                   />
                   <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--text-bright)' : 'var(--text-main)' }}>{year}</span>
                 </label>
               );
            })}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading ? (
            <div className="loading-state">Carregando estatísticas...</div>
          ) : error ? (
            <div className="error-state">Erro ao carregar dados. Tente novamente mais tarde.</div>
          ) : (
            <ReactECharts 
              option={option}
              notMerge={true} 
              style={{ height: '600px', width: '100%' }} 
              opts={{ renderer: 'svg' }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EstatisticaChart;
