import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { cardStyles } from './MetricsTab';
import { useTranslation } from 'react-i18next';
import ToggleSwitch from '../components/ToggleSwitch';
import BarChart from '../components/BarChart';
import { useAppTheme } from '../appTheme';
import SurveyComparisonChart from './SurveyDoughnutCharts';

const SurveyLeaderboardCard = () => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [tab, setTab] = useState('leaderboard');
  const myLabel = '#3';

  const getLeaderboardLabelColor = (l) => {
    if (l === myLabel) {
      return colors.skyblue;
    } else {
      return colors.silver;
    }
  };

  const renderBarChart = () => {
    const records = [
      { label: '#1', x: 91, y: '#1: 🏆' },
      { label: '#2', x: 72, y: '#2: 🥈' },
      { label: '#3', x: 68, y: '#3: 🥉' },
      { label: '#4', x: 57, y: '#4:' },
      { label: '#5', x: 50, y: '#5:' },
      { label: '#6', x: 40, y: '#6:' },
      { label: '#7', x: 30, y: '#7:' },
    ];
    return (
      <View>
        <Text style={styles.chartTitle}>{t('main-metrics.survey-response-rate')}</Text>
        <BarChart
          records={records}
          axisTitle=""
          isHorizontal={true}
          timeAxis={false}
          stacked={false}
          getColorForLabel={(l) => getLeaderboardLabelColor(l)}
          getColorForChartEl={(l) => getLeaderboardLabelColor(l)}
          hideLegend={true}
          reverse={false}
        />
        <View style={styles.statusTextWrapper}>
          <Text>{t('main-metrics.you-are-in')}</Text>
          <Text style={{ color: colors.navy, fontWeight: 'bold' }}> {myLabel} </Text>
          <Text>{t('main-metrics.place')}</Text>
        </View>
      </View>
    );
  };

  return (
    <Card style={cardStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('main-metrics.surveys')}
        titleVariant="titleLarge"
        titleStyle={cardStyles.titleText(colors)}
        subtitle={
          tab === 'leaderboard' ? t('main-metrics.leaderboard') : t('main-metrics.comparison')
        }
        subtitleStyle={[cardStyles.titleText(colors), cardStyles.subtitleText]}
        style={cardStyles.title(colors)}
        right={() => (
          <View style={{ gap: 3 }}>
            <ToggleSwitch
              density="high"
              value={tab}
              onValueChange={(v) => setTab(v as any)}
              buttons={[
                { icon: 'chart-bar', value: 'leaderboard' },
                { icon: 'arrow-collapse', value: 'comparison' },
              ]}
            />
          </View>
        )}
      />
      <Card.Content style={cardStyles.content}>
        {tab === 'leaderboard' ? renderBarChart() : <SurveyComparisonChart />}
      </Card.Content>
    </Card>
  );
};

const styles: any = {
  chartTitle: {
    alignSelf: 'center',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusTextWrapper: {
    alignSelf: 'center',
    display: 'flex',
    flexDirection: 'row',
    fontSize: 16,
  },
};

export default SurveyLeaderboardCard;
