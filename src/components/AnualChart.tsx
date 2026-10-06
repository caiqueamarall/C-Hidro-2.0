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
                    dataByYear[year].push([md, val]);
                    lastValidCota = val;
                 } else {
                    if (dataByYear[year].length > 0 && lastValidCota !== null) {
                       dataByYear[year].push([md, null]);
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
          // params[0].value[0] is the mapped date 'MM-DD'
          const dateParts = params[0].value[0].split('-');
          const monthDay = `${dateParts[1]}/${dateParts[0]}`; // DD/MM
          
          let html = `<div style="font-weight:bold;margin-bottom:8px;">${monthDay}</div>`;
          params.forEach((item: any) => {
            if (item.value && item.value[1] != null) {
              html += `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${item.color};"></span>
                  <span style="color:#64748B;">${item.seriesName}:</span>
                  <span style="font-weight:600;">${item.value[1]} cm</span>
                </div>
              `;
            }
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
        type: 'category',
        data: (function() {
          const days = [];
          const dim = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
          for (let m = 1; m <= 12; m++) {
            for (let d = 1; d <= dim[m - 1]; d++) {
              days.push(`${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
            }
          }
          return days;
        })(),
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        splitLine: { show: false },
        axisTick: {
          alignWithLabel: true,
          interval: function (_index: number, value: string) {
            return value.endsWith('-01') || value === '12-31';
          }
        },
        axisLabel: { 
          color: '#64748B',
          interval: function (_index: number, value: string) {
            return value.endsWith('-15');
          },
          formatter: function (value: string) {
            const m = parseInt(value.split('-')[0], 10);
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            return months[m - 1];
          }
        }
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
