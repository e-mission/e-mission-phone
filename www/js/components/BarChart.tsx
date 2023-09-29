import React from "react";
import Chart, { Props as ChartProps } from "./Chart";
import { useTheme } from "react-native-paper";
import { getGradient } from "./charting";

type Props = Omit<ChartProps, 'type'> & {
  meter?: {high: number, middle: number, dash_key: string},
}
const BarChart = ({ meter, ...rest }: Props) => {

  const { colors } = useTheme();

  if (meter) {
    rest.getColorForChartEl = (chart, dataset, ctx, colorFor) => {
      const darkenDegree = colorFor == 'border' ? 0.25 : 0;
      const alpha = colorFor == 'border' ? 1 : 0;
      return getGradient(chart, meter, dataset, ctx, alpha, darkenDegree);
    }
    rest.borderWidth = 3;
  }

  return (
    <Chart type="bar" {...rest} />
  );
}

export default BarChart;
