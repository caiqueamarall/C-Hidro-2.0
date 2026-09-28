import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
interface AnualChartProps {
  name: string;
  code: string;
  river: string;
  csvPath: string;
}

const AnualChart: React.FC<AnualChartProps> = ({ name, code, river, csvPath }) => {
  // groupedData: Record<Year, Array<[MappedDate, Cota]>>
  const [groupedData, setGroupedData] = useState<Record<string, [string, number | null][]>>({});
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, `stations/${code}/yearly_readings`));
        const dataByYear: Record<string, [string, number | null][]> = {};
        
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
                 } else {
                    if (dataByYear[year].length > 0 && lastValidCota !== null) {
                       dataByYear[year].push([`2024-${md}`, null]);
                    }
                 }
              }
           }
        });
        
        setGroupedData(dataByYear);
        const years = Object.keys(dataByYear).sort((a, b) => parseInt(b) - parseInt(a)); // Descending
        setAvailableYears(years);
        
        // Select the most recent year by default
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

  const toggleYear = (year: string) => {
    setSelectedYears(prev => 
      prev.includes(year) 
        ? prev.filter(y => y !== year)
        : [...prev, year]
    );
  };

  const option = useMemo(() => {
    const series = selectedYears.map(year => {
      return {
        name: year,
        type: 'line',
        showSymbol: false,
        connectNulls: false,
        lineStyle: {
          width: 2
        },
        data: groupedData[year] || []
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        textStyle: { color: '#0F172A' },
        formatter: function (params: any) {
          if (!params || params.length === 0) return '';
          // params[0].value[0] is the mapped date '2024-MM-DD'
          const dateParts = params[0].value[0].split('-');
          const monthDay = `${dateParts[2]}/${dateParts[1]}`; // DD/MM
          
          let html = `<div style="font-weight:bold;margin-bottom:8px;">${monthDay}</div>`;
          params.forEach((item: any) => {
            html += `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${item.color};"></span>
                <span style="color:#64748B;">${item.seriesName}:</span>
                <span style="font-weight:600;">${item.value[1]} cm</span>
              </div>
            `;
          });
          return html;
        }
      },
      legend: {
        type: 'scroll',
        data: selectedYears,
        top: 0,
        right: 20,
        textStyle: { color: '#475569' }
      },
      grid: {
        top: 30,
        right: 20,
        bottom: 40,
        left: 50,
        containLabel: true
      },
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
            // new Date("2024-01-01") is parsed as UTC, so we use getUTCMonth()
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return months[date.getUTCMonth()];
          }
        },
        splitNumber: 12,
        minInterval: 3600 * 24 * 1000 * 28, // approx 1 month
        maxInterval: 3600 * 24 * 1000 * 32  // approx 1 month
      },
      yAxis: {
        type: 'value',
        name: 'Cota (cm)',
        nameTextStyle: { color: '#64748B', padding: [0, 0, 0, 10] },
        axisLine: { show: true, lineStyle: { color: '#CBD5E1' } },
        splitLine: { lineStyle: { color: '#F1F5F9' } },
        axisLabel: { color: '#64748B' },
        scale: true
      },
      series: series
    };
  }, [groupedData, selectedYears]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">{name}</div>
          <div className="chart-subtitle">{river} • Código: {code}</div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-state">Carregando série anual...</div>
      ) : error ? (
        <div className="loading-state" style={{ color: '#ef4444' }}>Erro ao carregar dados.</div>
      ) : (
        <div className="anual-chart-container">
          <div className="year-selector">
            <div className="year-selector-title">Anos Disponíveis:</div>
            <div className="year-chips">
              {availableYears.map(year => (
                <button
                  key={year}
                  className={`year-chip ${selectedYears.includes(year) ? 'active' : ''}`}
                  onClick={() => toggleYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ flex: 1 }}>
            <ReactECharts 
              option={option} 
              style={{ height: '600px', width: '100%' }}
              notMerge={true}
              lazyUpdate={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AnualChart;
