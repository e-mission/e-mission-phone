
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { angularize } from '../angular-react-helper';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, TimeScale, ChartData, ScriptableContext, ChartArea } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import Annotation, { AnnotationOptions, LabelPosition } from 'chartjs-plugin-annotation';
import { defaultPalette, getChartHeight, getMeteredBackgroundColor, makeColorMap } from './charting';
import { getLabelOptions } from "../survey/multilabel/confirmHelper";

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Annotation,
);

type XYPair = { x: number|string, y: number|string };
type ChartDatasets = {
  label: string,
  data: XYPair[],
}[];

type Props = {
  records: { label: string, x: number|string, y: number|string }[],
  axisTitle: string,
  lineAnnotations?: { value: number, label?: string, color?:string, position?: LabelPosition }[],
  isHorizontal?: boolean,
  timeAxis?: boolean,
  stacked?: boolean,
  meter?: {high: number, middle: number, dash_key: string},
}
const BarChart = ({ records, axisTitle, lineAnnotations, isHorizontal, timeAxis, stacked, meter }: Props) => {

  const { colors } = useTheme();
  const [ numVisibleDatasets, setNumVisibleDatasets ] = useState(1);
  const [labelOptions, setLabelOptions] = useState(null);

  const indexAxis = isHorizontal ? 'y' : 'x';
  const barChartRef = useRef<ChartJS<'bar', XYPair[]>>(null);
  const [chartDatasets, setChartDatasets] = useState<ChartDatasets>([]);
  
  const chartData = useMemo<ChartData<'bar', XYPair[]>>(() => {
    if (!labelOptions) return { datasets: [] };
    const modeColors = makeColorMap(chartDatasets, labelOptions);
    return {
      datasets: chartDatasets.map((e, i) => ({
        ...e,
        backgroundColor: (barCtx) => 
          meter ? getMeteredBackgroundColor(meter, barCtx, chartDatasets[i], colors)
                : modeColors[chartDatasets[i]["label"]],
        borderColor: (barCtx) => 
          meter ? getMeteredBackgroundColor(meter, barCtx, chartDatasets[i], colors, .25)
                : modeColors[chartDatasets[i]["label"]],
      })),
    };
  }, [chartDatasets, meter, labelOptions]);

  // group records by label (this is the format that Chart.js expects)
  useEffect(() => {
    if (!labelOptions) {
      getLabelOptions().then((labelOptions) => setLabelOptions(labelOptions));
    }
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
    }, [] as ChartDatasets);
    setChartDatasets(d);
  }, [records]);

  return (
    <View style={getChartHeight(chartDatasets, numVisibleDatasets, indexAxis, isHorizontal, stacked)}>
      <Chart type='bar' ref={barChartRef}
        data={chartData}
        options={{
          indexAxis: indexAxis,
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 1,
          elements: {
            bar: {
              borderWidth: meter ? 3 : 0,
            }
          },
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
angularize(BarChart, 'BarChart', 'emission.main.barchart');
export default BarChart;
