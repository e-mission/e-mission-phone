import React, { useState } from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import { cardStyles } from './MetricsTab';
import { useTranslation } from 'react-i18next';
import ToggleSwitch from '../components/ToggleSwitch';

const SurveyLeaderboardCard = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [tab, setTab] = useState('leaderboard');

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
        {tab === 'leaderboard' ? t('main-metrics.leaderboard') : t('main-metrics.comparison')}
      </Card.Content>
    </Card>
  );
};

export default SurveyLeaderboardCard;
