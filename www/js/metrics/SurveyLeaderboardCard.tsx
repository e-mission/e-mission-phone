import React, { useState, useMemo } from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { cardStyles, SurveyMetric, SurveyObject } from './MetricsTab';
import { useTranslation } from 'react-i18next';
import ToggleSwitch from '../components/ToggleSwitch';
import BarChart from '../components/BarChart';
import { useAppTheme } from '../appTheme';
import SurveyComparisonChart from './SurveyDoughnutCharts';
import { Chart as ChartJS, registerables } from 'chart.js';
import Annotation from 'chartjs-plugin-annotation';

ChartJS.register(...registerables, Annotation);

type Props = {
  surveyMetric: SurveyMetric
}

type LeaderboardRecord = {
  label: string,
  x: number,
  y: string
}
export type SurveyComparison = {
  'me' : number,
  'others' : number,
}

const SurveyLeaderboardCard = ( { surveyMetric }: Props) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [tab, setTab] = useState('leaderboard');
  
  const myRank = surveyMetric.me.rank;
  const mySurveyMetric = surveyMetric.me.overview;
  const othersSurveyMetric = surveyMetric.others.overview;
  const mySurveyRate = Math.round(mySurveyMetric.answered / (mySurveyMetric.answered + mySurveyMetric.unanswered) * 100);

  const surveyComparison: SurveyComparison = {
    'me' : mySurveyRate,
    'others' : Math.round(othersSurveyMetric.answered / (othersSurveyMetric.answered + othersSurveyMetric.unanswered) * 100)
  }

  function getLabel(rank: number): string {
    if(rank === 0) {
      return '🏆 #1:';
    }else if(rank === 1) {
      return '🥈 #2:';
    }else if(rank === 2) {
      return '🥉 #3:';
    }else {
      return `#${rank+1}:`;
    }
  }

  const leaderboardRecords: LeaderboardRecord[] = useMemo(() => {
    const combinedLeaderboard:SurveyObject[] = [...surveyMetric.others.leaderboard];
    combinedLeaderboard.splice(myRank, 0, mySurveyMetric);

    // This is to prevent the leaderboard from being too long for UX purposes.
    // For a total of 20 members, we only show the top 5 members, myself, and the bottom 3 members.
    const numberOfTopUsers = 5
    const numberOfBottomUsers = surveyMetric.others.leaderboard.length -3;
    
    return combinedLeaderboard.map((item, idx) => (
      {
        'isMe': idx === myRank,
        'rank': idx,
        'answered': item.answered,
        'unanswered': item.unanswered,
        'mismatched': item.mismatched,
      }
    )).filter((item) => ( item.isMe || item.rank < numberOfTopUsers || item.rank >= numberOfBottomUsers))
    .map((item) => (
      {
        label: item.isMe ? `${item.rank}-me` : `${item.rank}-other`,
        x: Math.round(item.answered / (item.answered + item.unanswered) * 100),
        y: getLabel(item.rank)
      }
    ))
  }, [surveyMetric])
  
  const renderBarChart = () => {
    return (
      <View>
        <Text style={styles.chartTitle}>{t('main-metrics.survey-response-rate')}</Text>
        <BarChart
          records={leaderboardRecords}
          axisTitle=""
          isHorizontal={true}
          timeAxis={false}
          stacked={false}
          getColorForLabel={(l) => (l === `${myRank}-me` ? colors.skyblue : colors.silver)}
          getColorForChartEl={(l) => (l === `${myRank}-me` ? colors.skyblue : colors.silver)}
          showLegend={false}
          reverse={false}
          enableTooltip={false}
        />
        <View style={styles.statusTextWrapper}>
          <Text>{t('main-metrics.you-are-in')}</Text>
          <Text style={{ color: colors.navy, fontWeight: 'bold' }}> #{myRank+1} </Text>
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
        {tab === 'leaderboard' ? renderBarChart() : <SurveyComparisonChart surveyComparison={surveyComparison} />}
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
