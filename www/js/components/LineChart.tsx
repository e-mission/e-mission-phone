import React from "react";
import Chart, { Props as ChartProps } from "./Chart";

type Props = Omit<ChartProps, 'type'> & { }
const LineChart = ({ ...rest }: Props) => {
  return (
    <Chart type='line' {...rest} />
  );
}

export default LineChart;
