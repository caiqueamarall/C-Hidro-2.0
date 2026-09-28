import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Papa from 'papaparse';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
interface StationChartProps {
  name: string;
  code: string;
  river: string;
  csvPath: string;
  defaultColor: string;
}

const StationChart: React.FC<StationChartProps> = ({ name, code, river, csvPath, defaultColor }) => {
  const [data, setData] = useState<[string, number][]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Load color from localStorage or use default
  const storageKey = `chidro_color_${code}`;
  const [chartColor, setChartColor] = useState(() => {
    return localStorage.getItem(storageKey) || defaultColor;
  });

  useEffect(() => {
    localStorage.setItem(storageKey, chartColor);
  }, [chartColor, storageKey]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, `stations/${code}/yearly_readings`));
        
        const parsedData: [string, number | null][] = [];
        let lastDate: Date | null = null;
        
        const years: { year: string; readings: any }[] = [];
        snapshot.forEach(doc => years.push({ year: doc.id, readings: doc.data().readings || {} }));
        years.sort((a,b) => parseInt(a.year) - parseInt(b.year));
        
        const daysInMonths = [31,29,31,30,31,30,31,31,30,31,30,31];
        
        years.forEach(yearData => {
           const y = parseInt(yearData.year);
           for (let m=1; m<=12; m++) {
              const mStr = String(m).padStart(2, '0');
              const days = (m===2 && y%4!==0) ? 28 : daysInMonths[m-1];
              
              for (let d=1; d<=days; d++) {
                 const dStr = String(d).padStart(2, '0');
                 const md = `${mStr}-${dStr}`;
                 const val = yearData.readings[md];
                 
                 const currDate = new Date(y, m-1, d);
                 const dateStr = `${y}-${mStr}-${dStr}`;
                 
                 if (val !== undefined && val !== null) {
                    if (lastDate) {
                       const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
                       if (diffDays > 1) {
                         const missingDate = new Date(lastDate.getTime() + 24 * 3600 * 1000);
                         parsedData.push([missingDate.toISOString().split('T')[0], null]);
                       }
                    }
                    parsedData.push([dateStr, val]);
                    lastDate = currDate;
                 }
              }
           }
        });
        
        setData(parsedData);
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
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: chartColor,
        textStyle: { color: '#0F172A' }
      },
      legend: {
        data: ['Cota'],
        top: 0,
        right: 20,
        textStyle: { color: '#475569' }
      },
      grid: {
        top: 30,
        right: 20,
        bottom: 65,
        left: 50,
        containLabel: true
      },
      dataZoom: [
        {
          type: 'inside',
          start: 80,
          end: 100
        },
        {
          type: 'slider',
          start: 80,
          end: 100,
          height: 35,
          bottom: 5,
          borderColor: 'transparent',
          backgroundColor: 'rgba(241, 245, 249, 0.8)',
          fillerColor: 'rgba(2, 132, 199, 0.15)',
          handleSize: '120%',
          handleStyle: {
            color: '#FFFFFF',
            borderColor: chartColor,
            borderWidth: 2,
            shadowBlur: 6,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
            shadowOffsetX: 1,
            shadowOffsetY: 1
          },
          moveHandleSize: 35, // Same as slider height to make the whole area a drag handle
          moveHandleStyle: {
            color: 'transparent', // Make it invisible so it just acts as a cursor zone
            opacity: 0
          },
          brushSelect: false, // Disables drawing new selections, making it purely a slider
          textStyle: {
            color: '#64748B',
            fontWeight: 500
          },
          emphasis: {
            handleStyle: {
              borderColor: chartColor,
              borderWidth: 3
            }
          }
        }
      ],
      xAxis: {
        type: 'time',
        axisLine: { lineStyle: { color: '#CBD5E1' } },
        splitLine: { show: false },
        axisLabel: { color: '#64748B' }
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
      series: [
        {
          name: 'Cota',
          type: 'line',
          showSymbol: false,
          connectNulls: false, // Breaks the line when there's a null
          itemStyle: {
            color: chartColor
          },
          lineStyle: {
            width: 1.5
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${chartColor}40` }, // 25% opacity for light mode
                { offset: 1, color: `${chartColor}00` }
              ]
            }
          },
          data: data
        }
      ]
    };
  }, [data, chartColor]);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <div className="chart-title">{name}</div>
          <div className="chart-subtitle">{river} • Código: {code}</div>
        </div>
        <div className="color-picker-container">
          <label className="color-picker-label">Cor:</label>
          <input
            type="color"
            className="color-picker-input"
            value={chartColor}
            onChange={(e) => setChartColor(e.target.value)}
            title="Alterar cor do gráfico"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Carregando série histórica...</div>
      ) : error ? (
        <div className="loading-state" style={{ color: '#ef4444' }}>Erro ao carregar dados.</div>
      ) : (
        <ReactECharts
          option={option}
          style={{ height: '600px', width: '100%' }}
          notMerge={true}
          lazyUpdate={true}
        />
      )}
    </div>
  );
};

export default StationChart;
