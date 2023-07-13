
import React, { useRef, useState } from 'react';
import { array, string, bool } from 'prop-types';
import { angularize } from '../angular-react-helper';
import { View } from 'react-native';
import { useTheme, Card } from 'react-native-paper';

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
      <div>
        25 
        miles
      </div>
    </View>
  )
}

MetricsDetails.propTypes = {
  chartData: array,
};

angularize(MetricsDetails, 'MetricsDetails', 'emission.main.metricsdetails');
export default MetricsDetails;
