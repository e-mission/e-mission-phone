import React from "react";
import Chart, { Props as ChartProps } from "./Chart";
import { useTheme } from "react-native-paper";
import { getMeteredBackgroundColor } from "./charting";

type Props = Omit<ChartProps, 'type'> & {
  meter?: {high: number, middle: number, dash_key: string},
}
const BarChart = ({ meter, ...rest }: Props) => {

  const { colors } = useTheme();

  if (meter) {
    rest.getColorForLabel = (label, dataset, ctx, colorFor) => {
      const darkenDegree = colorFor == 'border' ? 0.25 : 0;
      return getMeteredBackgroundColor(meter, dataset, ctx, colors, darkenDegree);
    }
  }

  return (
    <Chart type="bar" {...rest} />
  );
}

export default BarChart;
