import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../appTheme';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const SurveyDoughnutCharts = () => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const myResonseRate = 68;
  const othersResponseRate = 41;

  const renderDoughnutChart = (rate) => {
    const data = {
      datasets: [
        {
          data: [rate, 100 - rate],
          backgroundColor: [colors.navy, colors.silver],
          borderColor: [colors.navy, colors.silver],
          borderWidth: 1,
        },
      ],
    };
    return (
      <View style={{ position: 'relative' }}>
        <View style={styles.textWrapper}>
          <Text>{rate}%</Text>
        </View>
        <Doughnut
          data={data}
          width={150}
          height={150}
          options={{
            cutout: 50,
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: false,
              },
            },
          }}
        />
      </View>
    );
  };

  return (
    <View>
      <Text style={styles.chartTitle}>{t('main-metrics.survey-response-rate')}</Text>
      <View style={styles.chartWrapper}>
        {renderDoughnutChart(myResonseRate)}
        {renderDoughnutChart(othersResponseRate)}
      </View>
    </View>
  );
};

const styles: any = {
  chartTitle: {
    alignSelf: 'center',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 20,
  },
  chartWrapper: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textWrapper: {
    position: 'absolute',
    width: 150,
    height: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default SurveyDoughnutCharts;
