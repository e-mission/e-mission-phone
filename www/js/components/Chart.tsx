
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, TimeScale, ChartData, ChartType, ScriptableContext, PointElement, LineElement } from 'chart.js';
import { Chart as ChartJSChart } from 'react-chartjs-2';
import Annotation, { AnnotationOptions, LabelPosition } from 'chartjs-plugin-annotation';
import { dedupColors, getChartHeight } from './charting';

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Annotation,
);

type XYPair = { x: number|string, y: number|string };
type ChartDataset = {
  label: string,
  data: XYPair[],
};

export type Props = {
  records: { label: string, x: number|string, y: number|string }[],
  axisTitle: string,
  type: 'bar'|'line',
  getColorForLabel: (label: string, currDataset?: ChartDataset, ctx?: ScriptableContext<'bar'|'line'>, colorFor?: 'background'|'border') => string|null,
  borderWidth?: number,
  lineAnnotations?: { value: number, label?: string, color?:string, position?: LabelPosition }[],
  isHorizontal?: boolean,
  timeAxis?: boolean,
  stacked?: boolean,
}
const Chart = ({ records, axisTitle, type, getColorForLabel, borderWidth, lineAnnotations, isHorizontal, timeAxis, stacked }: Props) => {

  const { colors } = useTheme();
  const [ numVisibleDatasets, setNumVisibleDatasets ] = useState(1);

  const indexAxis = isHorizontal ? 'y' : 'x';
  const chartRef = useRef<ChartJS<'bar'|'line', XYPair[]>>(null);
  const [chartDatasets, setChartDatasets] = useState<ChartDataset[]>([]);
  
  const chartData = useMemo<ChartData<'bar'|'line', XYPair[]>>(() => {
    let labelColorMap; // object mapping labels to colors
    if (getColorForLabel) {
      const colorEntries = chartDatasets.map(d => [d.label, getColorForLabel(d.label)] );
      labelColorMap = dedupColors(colorEntries);
    }
    return {
      datasets: chartDatasets.map((e, i) => ({
        ...e,
        backgroundColor: (barCtx) => labelColorMap[e.label] || getColorForLabel(e.label, e, barCtx, 'background'),
        borderColor: (barCtx) => labelColorMap[e.label] || getColorForLabel(e.label, e, barCtx, 'border'),
        borderWidth: borderWidth || 2,
      })),
    };
  }, [chartDatasets, getColorForLabel]);

  // group records by label (this is the format that Chart.js expects)
  useEffect(() => {
    const d = records?.reduce((acc, record) => {
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
    }, [] as ChartDataset[]);
    setChartDatasets(d);
  }, [records]);

  return (
    <View style={getChartHeight(chartDatasets, numVisibleDatasets, indexAxis, isHorizontal, stacked)}>
      <ChartJSChart type={type} ref={chartRef}
        data={chartData}
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
                beforeUpdate: (axis) => {
                  setNumVisibleDatasets(axis.chart.getVisibleDatasetCount())
                },
                ticks: timeAxis ? {} : {
                  callback: (value, i) => {
                    const label = chartDatasets[0].data[i].y;
                    if (typeof label == 'string' && label.includes('\n'))
                     return label.split('\n');
                    return label;
                  },
                  font: { size: 11 }, // default is 12, we want a tad smaller
                },
                reverse: true,
                stacked,
              },
              x: {
                title: { display: true, text: axisTitle },
                stacked,
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
                    const label = chartDatasets[0].data[i].x;
                    if (typeof label == 'string' && label.includes('\n'))
                      return label.split('\n');
                    return label;
                  },
                },
                stacked,
              },
              y: {
                title: { display: true, text: axisTitle },
                stacked,
              },
            }),
          },
          plugins: {
            ...(lineAnnotations?.length > 0 && {
              annotation: {
                annotations: lineAnnotations.map((a, i) => ({
                  type: 'line',
                  label: {
                    display: true,
                    padding: { x: 3, y: 1 },
                    borderRadius: 0,
                    backgroundColor: 'rgba(0,0,0,.7)',
                    color: 'rgba(255,255,255,1)',
                    font: { size: 10 },
                    position: a.position || 'start',
                    content: a.label,
                  },
                  ...(isHorizontal ? { xMin: a.value, xMax: a.value }
                    : { yMin: a.value, yMax: a.value }),
                  borderColor: a.color || colors.onBackground,
                  borderWidth: 3,
                  borderDash: [3, 3],
                } satisfies AnnotationOptions)),
              }
            }),
          }
        }} />
    </View>
  )
}
export default Chart;
