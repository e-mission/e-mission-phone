
import React, { useRef, useMemo } from 'react';
import { View } from 'react-native';
import { Chart, CategoryScale, LinearScale, Title, Tooltip, Legend, TimeScale, PointElement, LineElement } from 'chart.js';
import { Line } from 'react-chartjs-2';

Chart.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

type BarChartData = {
  label: string,
  data: { x: number|string, y: number|string }[],
}[];

type Props = {
  records: { label: string, x: number|string, y: number|string }[],
  axisTitle: string,
  isHorizontal?: boolean,
  timeAxis?: boolean,
}
const LineChart = ({ records, axisTitle, isHorizontal=true, timeAxis }: Props) => {

  const indexAxis = isHorizontal ? 'y' : 'x';
  const lineChartRef = useRef<Chart>(null);

  // group records by label (this is the format that Chart.js expects)
  const chartData = useMemo(() => {
    return records?.reduce((acc, record) => {
      const existing = acc.find(e => e.label == record.label);
      if (!existing) {
        acc.push({
          label: record.label,
          data: [{
            x: record.x,
            y: record.y,
          }],
        });
      } else {
        existing.data.push({
          x: record.x,
          y: record.y,
        });
      }
      return acc;
    }, [] as BarChartData);
  }, [records]);

  return (
    <View style={{ flex: 1 }}>
      <Line ref={lineChartRef}
        data={{datasets: chartData.map((e, i) => ({
          ...e,
          // cycle through the default palette, repeat if necessary
          backgroundColor: defaultPalette[i % defaultPalette.length],
          borderColor: defaultPalette[i % defaultPalette.length],
          borderWidth: 2,
          tension: .2,
        }))}}
        options={{
          indexAxis: indexAxis,
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 1,
          scales: {
            ...(isHorizontal ? {
              y: {
                offset: true,
                type: timeAxis ? 'time' : 'category',
                adapters: timeAxis ? {
                  date: { zone: 'utc' },
                } : {},
                time: timeAxis ? {
                  unit: 'day',
                  tooltipFormat: 'DDD', // Luxon "localized date with full month": e.g. August 6, 2014
                } : {},
                ticks: timeAxis ? {} : {
                  callback: (value, i) => {
                    const label = chartData[0].data[i].y;
                    if (typeof label == 'string' && label.includes('\n'))
                     return label.split('\n');
                    return label;
                  },
                },
                reverse: true,
              },
              x: {
                title: { display: true, text: axisTitle },
              },
            } : {
              x: {
                offset: true,
                type: timeAxis ? 'time' : 'category',
                adapters: timeAxis ? {
                  date: { zone: 'utc' },
                } : {},
                time: timeAxis ? {
                  unit: 'day',
                  tooltipFormat: 'DDD', // Luxon "localized date with full month": e.g. August 6, 2014
                } : {},
                ticks: timeAxis ? {} : {
                  callback: (value, i) => {
                    console.log("testing vertical", chartData, i);
                    const label = chartData[0].data[i].x;
                    if (typeof label == 'string' && label.includes('\n'))
                      return label.split('\n');
                    return label;
                  },
                },
              },
              y: {
                title: { display: true, text: axisTitle },
              },
            }),
          },
        }} />
    </View>
  )
}

const defaultPalette = [
  '#c95465', // red oklch(60% 0.15 14)
  '#4a71b1', // blue oklch(55% 0.11 260)
  '#d2824e', // orange oklch(68% 0.12 52)
  '#856b5d', // brown oklch(55% 0.04 50)
  '#59894f', // green oklch(58% 0.1 140)
  '#e0cc55', // yellow oklch(84% 0.14 100)
  '#b273ac', // purple oklch(64% 0.11 330)
  '#f09da6', // pink oklch(78% 0.1 12)
  '#b3aca8', // grey oklch(75% 0.01 55)
  '#80afad', // teal oklch(72% 0.05 192)
];


export default LineChart;
