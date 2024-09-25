import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { ChartData, Chart as ChartJS, ScriptableContext, registerables } from 'chart.js';
import { Chart as ChartJSChart } from 'react-chartjs-2';
import Annotation, { AnnotationOptions, LabelPosition } from 'chartjs-plugin-annotation';
import { getChartHeight } from './charting';
import { base_modes } from 'e-mission-common';
import { logDebug } from '../plugin/logger';

ChartJS.register(...registerables, Annotation);

type XYPair = { x: number | string; y: number | string };
type ChartDataset = {
  label: string;
  data: XYPair[];
};
export type ChartRecord = { label: string; x: number | string; y: number | string };

export type Props = {
  records: ChartRecord[];
  axisTitle: string;
  type: 'bar' | 'line';
  getColorForLabel?: (label: string) => string;
  getColorForChartEl?: (
    chart,
    currDataset: ChartDataset,
    ctx: ScriptableContext<'bar' | 'line'>,
    colorFor: 'background' | 'border',
  ) => string | CanvasGradient | null;
  borderWidth?: number;
  lineAnnotations?: { value: number; label?: string; color?: string; position?: LabelPosition }[];
  isHorizontal?: boolean;
  timeAxis?: boolean;
  stacked?: boolean;
  showLegend?: boolean;
  reverse?: boolean;
  enableTooltip?: boolean;
  maxBarThickness?: number;
};
const Chart = ({
  records,
  axisTitle,
  type,
  getColorForLabel,
  getColorForChartEl,
  borderWidth,
  lineAnnotations,
  isHorizontal,
  timeAxis,
  stacked,
  showLegend = true,
  reverse = true,
  enableTooltip = true,
  maxBarThickness = 100,
}: Props) => {
  const { colors } = useTheme();
  const [numVisibleDatasets, setNumVisibleDatasets] = useState(1);

  const indexAxis = isHorizontal ? 'y' : 'x';
  const chartRef = useRef<ChartJS<'bar' | 'line', XYPair[]>>(null);
  const [chartDatasets, setChartDatasets] = useState<ChartDataset[]>([]);

  const chartData = useMemo<ChartData<'bar' | 'line', XYPair[]>>(() => {
    let labelColorMap; // object mapping labels to colors
    if (getColorForLabel) {
      const colorEntries = chartDatasets.map((d) => [d.label, getColorForLabel(d.label)]);
      labelColorMap = base_modes.dedupe_colors(colorEntries, [0.4, 1.6]);
    }
    return {
      datasets: chartDatasets.map((e, i) => ({
        ...e,
        backgroundColor: (barCtx) =>
          labelColorMap?.[e.label] ||
          getColorForChartEl?.(chartRef.current, e, barCtx, 'background'),
        borderColor: (barCtx) =>
          base_modes.scale_lightness(labelColorMap?.[e.label], 0.5) ||
          getColorForChartEl?.(chartRef.current, e, barCtx, 'border'),
        borderWidth: borderWidth || 2,
        borderRadius: 3,
        maxBarThickness: maxBarThickness,
      })),
    };
  }, [chartDatasets, getColorForLabel]);

  // group records by label (this is the format that Chart.js expects)
  useEffect(() => {
    const d = records?.reduce((acc, record) => {
      const existing = acc.find((e) => e.label == record.label);
      if (!existing) {
        acc.push({
          label: record.label,
          data: [
            {
              x: record.x,
              y: record.y,
            },
          ],
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

  const annotationsAtTop =
    isHorizontal && lineAnnotations?.some((a) => !a.position || a.position == 'start');

  return (
    <View
      style={getChartHeight(chartDatasets, numVisibleDatasets, indexAxis, isHorizontal, stacked)}>
      <ChartJSChart
        type={type}
        ref={chartRef}
        data={chartData}
        options={{
          indexAxis: indexAxis,
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 1,
          spanGaps: 1000 * 60 * 60 * 24, // 1 day
          scales: {
            ...(isHorizontal
              ? {
                  y: {
                    offset: true,
                    type: timeAxis ? 'time' : 'category',
                    adapters: timeAxis
                      ? {
                          date: { zone: 'utc' },
                        }
                      : {},
                    time: timeAxis
                      ? {
                          unit: 'day',
                          tooltipFormat: 'DDD', // Luxon "localized date with full month": e.g. August 6, 2014
                        }
                      : {},
                    beforeUpdate: (axis) => {
                      setNumVisibleDatasets(axis.chart.getVisibleDatasetCount());
                    },
                    ticks: timeAxis
                      ? {}
                      : {
                          callback: (value, i) => {
                            //account for different data possiblities
                            const label =
                              chartDatasets[0].data[i]?.y || chartDatasets[i].data[0]?.y;
                            if (typeof label == 'string' && label.includes('\n'))
                              return label.split('\n');
                            return label;
                          },
                          font: { size: 11 }, // default is 12, we want a tad smaller
                        },
                    reverse: reverse,
                    stacked,
                  },
                  x: {
                    title: { display: true, text: axisTitle },
                    stacked,
                  },
                }
              : {
                  x: {
                    offset: true,
                    type: timeAxis ? 'time' : 'category',
                    adapters: timeAxis
                      ? {
                          date: { zone: 'utc' },
                        }
                      : {},
                    time: timeAxis
                      ? {
                          unit: 'day',
                          tooltipFormat: 'DDD', // Luxon "localized date with full month": e.g. August 6, 2014
                        }
                      : {},
                    ticks: timeAxis
                      ? {}
                      : {
                          callback: (value, i) => {
                            //account for different data possiblities - one mode per week, one mode both weeks, mixed weeks
                            const label =
                              chartDatasets[0].data[i]?.x || chartDatasets[i].data[0]?.x;
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
            legend: {
              display: showLegend,
            },
            tooltip: {
              enabled: enableTooltip,
            },
            ...(lineAnnotations?.length && {
              annotation: {
                clip: false,
                annotations: lineAnnotations.map(
                  (a, i) =>
                    ({
                      type: 'line',
                      label: {
                        display: true,
                        padding: { x: 3, y: 1 },
                        // @ts-ignore
                        borderRadius: 0,
                        backgroundColor: 'rgba(0,0,0,.7)',
                        color: 'rgba(255,255,255,1)',
                        font: { size: 10 },
                        position: a.position || 'start',
                        ...(a.label && {
                          content: a.label,
                        }),
                        yAdjust: annotationsAtTop ? -12 : 0,
                      },
                      ...(isHorizontal
                        ? { xMin: a.value, xMax: a.value }
                        : { yMin: a.value, yMax: a.value }),
                      borderColor: a.color || colors.onBackground,
                      borderWidth: 3,
                      borderDash: [3, 3],
                    }) satisfies AnnotationOptions,
                ),
              },
            }),
          },
        }}
        // if there are annotations at the top of the chart, it overlaps with the legend
        // so we need to increase the spacing between the legend and the chart
        // https://stackoverflow.com/a/73498454
        plugins={
          annotationsAtTop
            ? [
                {
                  id: 'increase-legend-spacing',
                  beforeInit(chart) {
                    const originalFit = (chart.legend as any).fit;
                    (chart.legend as any).fit = function fit() {
                      originalFit.bind(chart.legend)();
                      this.height += 12;
                    };
                  },
                },
              ]
            : []
        }
      />
    </View>
  );
};
export default Chart;
