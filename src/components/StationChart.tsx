import React, { useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import Papa from 'papaparse';

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
        const response = await fetch(csvPath);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const text = await response.text();

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData: [string, number | null][] = [];
            let lastDate: Date | null = null;

            results.data.forEach((row: any) => {
              const dateStr = row['Data'];
              const cotaStr = row['Cota'];

              if (dateStr) {
                // PapaParse gives DD/MM/YYYY or YYYY-MM-DD depending on your CSV.
                // Assuming it's already sortable or we parse it correctly. 
                // Let's create a Date object to check gaps.
                const currDateParts = dateStr.split('/');
                let currDate: Date;
                if (currDateParts.length === 3) {
                  // DD/MM/YYYY format
                  currDate = new Date(parseInt(currDateParts[2]), parseInt(currDateParts[1]) - 1, parseInt(currDateParts[0]));
                } else {
                  // Fallback for YYYY-MM-DD or standard parse
                  currDate = new Date(dateStr);
                }

                if (lastDate) {
                  const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

                  if (diffDays === 0) {
                    // Duplicate date! Update the last point instead of pushing a new one.
                    // This prevents the 'lttb' sampling algorithm from generating criss-crossing lines.
                    const cota = parseFloat(cotaStr);
                    if (!isNaN(cota)) {
                      parsedData[parsedData.length - 1][1] = cota;
                    }
                    return; // Skip to next row
                  } else if (diffDays > 1) {
                    // There's a gap! Insert a null point to break the line
                    const missingDate = new Date(lastDate.getTime() + 24 * 3600 * 1000);
                    parsedData.push([missingDate.toISOString().split('T')[0], null]);
                  }
                }

                const cota = parseFloat(cotaStr);
                if (!isNaN(cota)) {
                  parsedData.push([dateStr, cota]);
                  lastDate = currDate;
                }
              }
            });
            setData(parsedData as [string, number][]);
            setLoading(false);
          },
          error: () => {
            setError(true);
            setLoading(false);
          }
        });
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
