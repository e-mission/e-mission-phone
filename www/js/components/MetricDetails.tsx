
import React, { useRef, useState } from 'react';
import { array, string, bool } from 'prop-types';
import { angularize } from '../angular-react-helper';
import { View } from 'react-native';
import { useTheme } from 'react-native-paper';

const MetricsDetails = ({ chartData}) => {
 
  const { colors } = useTheme();
  const [ numVisibleDatasets, setNumVisibleDatasets ] = useState(1);

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
  ]

  

  return (
    <View>
      
    </View>
  )
}

MetricsDetails.propTypes = {
  chartData: array,
  axisTitle: string,
  lineAnnotations: array,
  isHorizontal: bool,
};

angularize(MetricsDetails, 'MetricsDetails', 'emission.main.metricsdetails');
export default MetricsDetails;

// const sampleAnnotations = [
//   { value: 35, label: 'Target1' },
//   { value: 65, label: 'Target2' },
// ];

// const sampleChartData = [
//   {
//     label: 'Primary',
//     records: [
//       { x: moment('2023-06-20'), y: 20 },
//       { x: moment('2023-06-21'), y: 30 },
//       { x: moment('2023-06-23'), y: 80 },
//       { x: moment('2023-06-24'), y: 40 },
//     ],
//   },
//   {
//     label: 'Secondary',
//     records: [
//       { x: moment('2023-06-21'), y: 10 },
//       { x: moment('2023-06-22'), y: 50 },
//       { x: moment('2023-06-23'), y: 30 },
//       { x: moment('2023-06-25'), y: 40 },
//     ],
//   },
//   {
//     label: 'Tertiary',
//     records: [
//       { x: moment('2023-06-20'), y: 30 },
//       { x: moment('2023-06-22'), y: 40 },
//       { x: moment('2023-06-24'), y: 10 },
//       { x: moment('2023-06-25'), y: 60 },
//     ],
//   },
//   {
//     label: 'Quaternary',
//     records: [
//       { x: moment('2023-06-22'), y: 10 },
//       { x: moment('2023-06-23'), y: 20 },
//       { x: moment('2023-06-24'), y: 30 },
//       { x: moment('2023-06-25'), y: 40 },
//     ],
//   },
// ];
