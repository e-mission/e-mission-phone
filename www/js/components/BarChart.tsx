
import React, { useRef, useState, useMemo } from 'react';
import { angularize } from '../angular-react-helper';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, TimeScale, ChartData } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import Annotation, { AnnotationOptions, LabelPosition } from 'chartjs-plugin-annotation';

Chart.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Annotation,
);

type BarChartData = {
  label: string,
  data: { x: number|string, y: number|string }[],
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

  const indexAxis = isHorizontal ? 'y' : 'x';
  const barChartRef = useRef<Chart>(null);

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

  function getChartHeight() {
    /* when horizontal charts have more data, they should get taller
      so they don't look squished */
    if (isHorizontal) {
      // 'ideal' chart height is based on the number of datasets and number of unique index values
      const uniqueIndexVals = [];
      chartData.forEach(e => e.data.forEach(r => {
        if (!uniqueIndexVals.includes(r[indexAxis])) uniqueIndexVals.push(r[indexAxis]);
      }));
      const numIndexVals = uniqueIndexVals.length;
      const heightPerIndexVal = stacked ? 36 : numVisibleDatasets * 8;
      const idealChartHeight = heightPerIndexVal * numIndexVals;

      /* each index val should be at least 20px tall for visibility,
        and the graph itself should be at least 250px tall */
      const minChartHeight = Math.max(numIndexVals * 20, 250);

      // return whichever is greater
      return { height: Math.max(idealChartHeight, minChartHeight) };
    }
    // vertical charts should just fill the available space in the parent container
    return { flex: 1 };
  }

  function getBarHeight(stacks) {
    let totalHeight = 0;
    console.log("ctx stacks", stacks.x);
    for(let val in stacks.x) {
      if(!val.startsWith('_')){
        totalHeight += stacks.x[val];
        console.log("ctx added ", val );
      }
    }
    return totalHeight;
  }

  //fill pattern creation
    //https://stackoverflow.com/questions/28569667/fill-chart-js-bar-chart-with-diagonal-stripes-or-other-patterns
  function createDiagonalPattern(color = 'black') {
    let shape = document.createElement('canvas')
    shape.width = 10
    shape.height = 10
    let c = shape.getContext('2d')
    c.strokeStyle = color
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(2, 0)
    c.lineTo(10, 8)
    c.stroke()
    c.beginPath()
    c.moveTo(0, 8)
    c.lineTo(2, 10)
    c.stroke()
    return c.createPattern(shape, 'repeat')
  }
  
  return (
    <View style={[getChartHeight()]}>
      <Bar ref={barChartRef}
        data={{datasets: chartData.map((e, i) => ({
          ...e,
          // cycle through the default palette, repeat if necessary
          backgroundColor: (ctx: any) => {
            if(meter) {
              let bar_height = getBarHeight(ctx.parsed._stacks);
              console.debug("bar height for", ctx.raw.y," is ", bar_height, "which in chart is", chartData[i]);
              //if "unlabeled", etc -> stripes
              if(chartData[i].label == meter.dash_key) {
                if (bar_height > meter.high) return createDiagonalPattern(colors.danger);
                else if (bar_height > meter.middle) return createDiagonalPattern(colors.warn);
                else return createDiagonalPattern(colors.success);
              }
              //if :labeled", etc -> solid
              if (bar_height > 54) return colors.danger;
              else if (bar_height > 14) return colors.warn;
              else return colors.success;
            }
            return defaultPalette[i % defaultPalette.length];
          },
          borderColor: (ctx: any) => {
            let bar_height = getBarHeight(ctx.parsed._stacks);
            if(meter) {
              if (bar_height > 54) return colors.danger;
              else if (bar_height > 14) return colors.warn;
              else return colors.success;
          }}
        }))}}
        options={{
          indexAxis: indexAxis,
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 1,
          elements: {
            bar: {
              borderWidth: meter ? 2 : 0,
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
                    const label = chartData[0].data[i].y;
                    if (typeof label == 'string' && label.includes('\n'))
                     return label.split('\n');
                    return label;
                  },
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
                    const label = chartData[0].data[i].x;
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


angularize(BarChart, 'BarChart', 'emission.main.barchart');
export default BarChart;
