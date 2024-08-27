import React, { useContext, useMemo, useState } from 'react';
import { Card, DataTable, Text, useTheme } from 'react-native-paper';
import { MetricsData } from '../metricsTypes';
import { metricsStyles } from '../MetricsScreen';
import {
  formatDate,
  formatDateRangeOfDays,
  secondsToMinutes,
  segmentDaysByWeeks,
  valueForFieldOnDay,
} from '../metricsHelper';
import { useTranslation } from 'react-i18next';
import { labelKeyToText } from '../../survey/multilabel/confirmHelper';
import TimelineContext from '../../TimelineContext';

type Props = { userMetrics?: MetricsData; activeModes: string[] };
const ActiveMinutesTableCard = ({ userMetrics, activeModes }: Props) => {
  const { colors } = useTheme();
  const { dateRange } = useContext(TimelineContext);
  const { t } = useTranslation();

  const cumulativeTotals = useMemo(() => {
    if (!userMetrics?.duration) return [];
    const totals = {};
    activeModes.forEach((mode) => {
      const sum = userMetrics.duration.reduce(
        (acc, day) => acc + (valueForFieldOnDay(day, 'mode_confirm', mode) || 0),
        0,
      );
      totals[mode] = secondsToMinutes(sum);
    });
    totals['period'] = formatDateRangeOfDays(userMetrics.duration);
    return totals;
  }, [userMetrics?.duration]);

  const recentWeeksActiveModesTotals = useMemo(() => {
    if (!userMetrics?.duration) return [];
    return segmentDaysByWeeks(userMetrics.duration, dateRange[1])
      .reverse()
      .map((week) => {
        const totals = {};
        activeModes.forEach((mode) => {
          const sum = week.reduce(
            (acc, day) => acc + (valueForFieldOnDay(day, 'mode_confirm', mode) || 0),
            0,
          );
          totals[mode] = secondsToMinutes(sum);
        });
        totals['period'] = formatDateRangeOfDays(week);
        return totals;
      });
  }, [userMetrics?.duration]);

  const dailyActiveModesTotals = useMemo(() => {
    if (!userMetrics?.duration) return [];
    return userMetrics.duration
      .map((day) => {
        const totals = {};
        activeModes.forEach((mode) => {
          const sum = valueForFieldOnDay(day, 'mode_confirm', mode) || 0;
          totals[mode] = secondsToMinutes(sum);
        });
        totals['period'] = formatDate(day);
        return totals;
      })
      .reverse();
  }, [userMetrics?.duration]);

  const allTotals = [cumulativeTotals, ...recentWeeksActiveModesTotals, ...dailyActiveModesTotals];

  const itemsPerPage = 5;
  const [page, setPage] = useState(0);
  const from = page * itemsPerPage;
  const to = Math.min((page + 1) * itemsPerPage, allTotals.length);

  return (
    <Card style={metricsStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title
        title={t('metrics.movement.active-minutes-table')}
        subtitleStyle={metricsStyles.subtitleText}
      />
      <Card.Content style={metricsStyles.content}>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title> </DataTable.Title>
            {activeModes.map((mode, i) => (
              <DataTable.Title style={{ padding: 5 }} key={i}>
                {labelKeyToText(mode)}
              </DataTable.Title>
            ))}
          </DataTable.Header>
          {allTotals.slice(from, to).map((total, i) => (
            <DataTable.Row key={i} style={{ minHeight: 0, padding: 5 }}>
              <DataTable.Cell>{total['period']}</DataTable.Cell>
              {activeModes.map((mode, j) => (
                <DataTable.Cell key={j}>
                  {total[mode]} {t('metrics.movement.minutes')}
                </DataTable.Cell>
              ))}
            </DataTable.Row>
          ))}
          <DataTable.Pagination
            page={page}
            onPageChange={(p) => setPage(p)}
            numberOfPages={Math.ceil(allTotals.length / 5)}
            numberOfItemsPerPage={5}
            label={`${page * 5 + 1}-${page * 5 + 5} of ${allTotals.length}`}
          />
        </DataTable>
      </Card.Content>
    </Card>
  );
};

export default ActiveMinutesTableCard;
