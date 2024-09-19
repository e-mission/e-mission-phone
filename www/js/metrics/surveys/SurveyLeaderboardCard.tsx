import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Card } from 'react-native-paper';
import { metricsStyles } from '../MetricsScreen';
import { useTranslation } from 'react-i18next';
import BarChart from '../../components/BarChart';
import { useAppTheme } from '../../appTheme';
import { Chart as ChartJS, registerables } from 'chart.js';
import Annotation from 'chartjs-plugin-annotation';

ChartJS.register(...registerables, Annotation);

type Props = {
  studyStartDate: string;
  surveyMetric;
};

type LeaderboardRecord = {
  label: string;
  x: number;
  y: string;
};

const SurveyLeaderboardCard = ({ studyStartDate, surveyMetric }: Props) => {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const myRank = surveyMetric.me.rank;
  const mySurveyMetric = surveyMetric.me.overview;

  function getLabel(rank: number): string {
    if (rank === 0) {
      return '🏆 #1:';
    } else if (rank === 1) {
      return '🥈 #2:';
    } else if (rank === 2) {
      return '🥉 #3:';
    } else {
      return `#${rank + 1}:`;
    }
  }

  const leaderboardRecords: LeaderboardRecord[] = useMemo(() => {
    const combinedLeaderboard = [...surveyMetric.others.leaderboard];
    combinedLeaderboard.splice(myRank, 0, mySurveyMetric);

    // This is to prevent the leaderboard from being too long for UX purposes.
    // For a total of 20 members, we only show the top 5 members, myself, and the bottom 3 members.
    const numberOfTopUsers = 5;
    const numberOfBottomUsers = surveyMetric.others.leaderboard.length - 3;

    return combinedLeaderboard
      .map((item, idx) => ({
        isMe: idx === myRank,
        rank: idx,
        answered: item.answered,
        unanswered: item.unanswered,
        mismatched: item.mismatched,
      }))
      .filter(
        (item) => item.isMe || item.rank < numberOfTopUsers || item.rank >= numberOfBottomUsers,
      )
      .map((item) => ({
        label: item.isMe ? `${item.rank}-me` : `${item.rank}-other`,
        x: Math.round((item.answered / (item.answered + item.unanswered)) * 100),
        y: getLabel(item.rank),
      }));
  }, [surveyMetric]);

  return (
    <Card style={metricsStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('metrics.surveys.surveys')}
        subtitle={t('metrics.leaderboard.leaderboard')}
        subtitleStyle={metricsStyles.subtitleText}
      />
      <Card.Content style={metricsStyles.content}>
        <View>
          <Text style={styles.chartDesc}>
            * {t('metrics.leaderboard.data-accumulated-since-date', { date: studyStartDate })}
          </Text>
          <Text style={styles.chartTitle}>{t('metrics.surveys.survey-response-rate')}</Text>
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
            <Text>{t('metrics.leaderboard.you-are-in-x-place', { x: myRank + 1 })}</Text>
          </View>
        </View>
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
  chartDesc: {
    fontSoze: 12,
    marginBottom: 10,
  },
  statusTextWrapper: {
    alignSelf: 'center',
    display: 'flex',
    flexDirection: 'row',
    fontSize: 16,
  },
};

export default SurveyLeaderboardCard;
