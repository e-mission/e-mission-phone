import React from 'react';
import { View, Text } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../appTheme';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export const LabelPanel = ({ first, second }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.labelWrapper}>
      <View style={styles.labelItem}>
        <View style={{ backgroundColor: colors.navy, width: 20, height: 20 }} />
        <Text>{first}</Text>
      </View>
      <View style={styles.labelItem}>
        <View style={{ backgroundColor: colors.orange, width: 20, height: 20 }} />
        <Text>{second}</Text>
      </View>
    </View>
  );
};

const SurveyDoughnutCharts = () => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const myResonseRate = 68;
  const othersResponseRate = 41;

  const renderDoughnutChart = (rate, chartColor, myResponse) => {
    const data = {
      datasets: [
        {
          data: [rate, 100 - rate],
          backgroundColor: [chartColor, colors.silver],
          borderColor: [chartColor, colors.silver],
          borderWidth: 1,
        },
      ],
    };
    return (
      <View style={{ position: 'relative' }}>
        <View style={styles.textWrapper}>
          {myResponse ? (
            <Icon source="account" size={40} />
          ) : (
            <Icon source="account-group" size={40} />
          )}
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
        {renderDoughnutChart(myResonseRate, colors.navy, true)}
        {renderDoughnutChart(othersResponseRate, colors.orange, false)}
      </View>
      <LabelPanel first={t('main-metrics.you')} second={t('main-metrics.others')} />
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
    marginBottom: 20,
  },
  textWrapper: {
    position: 'absolute',
    width: 150,
    height: 150,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelWrapper: {
    alignSelf: 'center',
    display: 'flex',
    gap: 10,
  },
  labelItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
};

export default SurveyDoughnutCharts;
