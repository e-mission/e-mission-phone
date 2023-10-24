import React, { useMemo, useState } from 'react';
import { Card, DataTable, useTheme } from 'react-native-paper';
import { MetricsData } from './metricsTypes';
import { cardStyles } from './MetricsTab';
import { formatDate, formatDateRangeOfDays, secondsToMinutes, segmentDaysByWeeks } from './metricsHelper';
import { useTranslation } from 'react-i18next';
import { ACTIVE_MODES } from './WeeklyActiveMinutesCard';
import { labelKeyToRichMode } from '../survey/multilabel/confirmHelper';

type Props = { userMetrics: MetricsData }
const ActiveMinutesTableCard = ({ userMetrics }: Props) => {

  const { colors } = useTheme();
  const { t } = useTranslation();

  const cumulativeTotals = useMemo(() => {
    if (!userMetrics?.duration) return [];
    const totals = {};
    ACTIVE_MODES.forEach(mode => {
      const sum = userMetrics.duration.reduce((acc, day) => (
        acc + (day[`label_${mode}`] || 0)
      ), 0);
      totals[mode] = secondsToMinutes(sum);
    });
    totals['period'] = formatDateRangeOfDays(userMetrics.duration);
    return totals;
  }, [userMetrics?.duration]);

  const recentWeeksActiveModesTotals = useMemo(() => {
    if (!userMetrics?.duration) return [];
    return segmentDaysByWeeks(userMetrics.duration).reverse().map(week => {
      const totals = {};
      ACTIVE_MODES.forEach(mode => {
        const sum = week.reduce((acc, day) => (
          acc + (day[`label_${mode}`] || 0)
        ), 0);
        totals[mode] = secondsToMinutes(sum);
      })
      totals['period'] = formatDateRangeOfDays(week);
      return totals;
    });
  }, [userMetrics?.duration]);

  const dailyActiveModesTotals = useMemo(() => {
    if (!userMetrics?.duration) return [];
    return userMetrics.duration.map(day => {
      const totals = {};
      ACTIVE_MODES.forEach(mode => {
        const sum = day[`label_${mode}`] || 0;
        totals[mode] = secondsToMinutes(sum);
      })
      totals['period'] = formatDate(day);
      return totals;
    }).reverse();
  }, [userMetrics?.duration]);

  const allTotals = [cumulativeTotals, ...recentWeeksActiveModesTotals, ...dailyActiveModesTotals];

  const itemsPerPage = 5;
  const [page, setPage] = useState(0);
  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, allTotals.length);

  return (
    <Card style={cardStyles.card}
      contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('main-metrics.active-minutes')}
        titleVariant='titleLarge'
        titleStyle={cardStyles.titleText(colors)}
        subtitle={t('main-metrics.active-minutes-table')}
        subtitleStyle={[cardStyles.titleText(colors), cardStyles.subtitleText]}
        style={cardStyles.title(colors)} />
      <Card.Content style={cardStyles.content}>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title> </DataTable.Title>
            {ACTIVE_MODES.map((mode, i) =>
              <DataTable.Title style={{padding: 5}} key={i}>{labelKeyToRichMode(mode)}</DataTable.Title>
            )}
          </DataTable.Header>
          {allTotals.slice(from, to).map((total, i) =>
            <DataTable.Row key={i} style={{minHeight: 0, padding: 5}}>
              <DataTable.Cell>{total['period']}</DataTable.Cell>
              {ACTIVE_MODES.map((mode, j) =>
                <DataTable.Cell key={j}>{total[mode]} {t('metrics.minutes')}</DataTable.Cell>
              )}
            </DataTable.Row>
          )}
          <DataTable.Pagination page={page} onPageChange={p => setPage(p)}
            numberOfPages={Math.ceil(allTotals.length / 5)} numberOfItemsPerPage={5}
            label={`${page * 5 + 1}-${page * 5 + 5} of ${allTotals.length}`} />
        </DataTable>
      </Card.Content>
    </Card>
  )
}

export default ActiveMinutesTableCard;
