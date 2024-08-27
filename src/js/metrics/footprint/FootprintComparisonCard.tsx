import React, { useContext, useMemo } from 'react';
import { Card, Text } from 'react-native-paper';
import { metricsStyles } from '../MetricsScreen';
import BarChart from '../../components/BarChart';
import { useTranslation } from 'react-i18next';
import { ChartRecord } from '../../components/Chart';
import TimelineContext from '../../TimelineContext';
import { formatIsoNoYear } from '../../datetimeUtil';

const FootprintComparisonCard = ({
  type,
  unit,
  userCumulativeFootprint,
  groupCumulativeFootprint,
  title,
  addFootnote,
  axisTitle,
  goals,
  showUncertainty,
  nDays,
}) => {
  const { t } = useTranslation();
  const { queriedDateRange } = useContext(TimelineContext);

  const chartRecords = useMemo(() => {
    let records: ChartRecord[] = [];
    if (!queriedDateRange || !userCumulativeFootprint || !groupCumulativeFootprint) return records;

    const nAggUserDays = groupCumulativeFootprint['nUsers'];
    const yAxisLabelGroup =
      t('metrics.footprint.group-average') + '\n' + formatIsoNoYear(...queriedDateRange);
    records.push({
      label: t('metrics.footprint.labeled'),
      x: groupCumulativeFootprint[unit] / nAggUserDays,
      y: yAxisLabelGroup,
    });
    if (showUncertainty && groupCumulativeFootprint[`${unit}_uncertain`]) {
      records.push({
        label:
          t('metrics.footprint.unlabeled') +
          addFootnote(t('metrics.footprint.uncertainty-footnote')),
        x: groupCumulativeFootprint[`${unit}_uncertain`]! / nAggUserDays,
        y: yAxisLabelGroup,
      });
    }

    const yAxisLabelUser = t('metrics.footprint.you') + '\n' + formatIsoNoYear(...queriedDateRange);
    records.push({
      label: t('metrics.footprint.labeled'),
      x: userCumulativeFootprint[unit] / nDays,
      y: yAxisLabelUser,
    });
    if (showUncertainty && userCumulativeFootprint[`${unit}_uncertain`]) {
      records.push({
        label:
          t('metrics.footprint.unlabeled') +
          addFootnote(t('metrics.footprint.uncertainty-footnote')),
        x: userCumulativeFootprint[`${unit}_uncertain`]! / nDays,
        y: yAxisLabelUser,
      });
    }

    return records;
  }, [userCumulativeFootprint, groupCumulativeFootprint]);

  let meter = goals[type]?.length
    ? {
        uncertainty_prefix: t('metrics.footprint.unlabeled'),
        middle: goals[type][0].value,
        high: goals[type][goals[type].length - 1].value,
      }
    : undefined;

  return (
    <Card style={metricsStyles.card} contentStyle={{ flex: 1 }}>
      <Card.Title title={title} />
      <Card.Content style={metricsStyles.content}>
        {chartRecords?.length > 0 ? (
          <>
            <BarChart
              records={chartRecords}
              axisTitle={axisTitle}
              isHorizontal={true}
              timeAxis={false}
              stacked={true}
              lineAnnotations={goals[type]}
              meter={meter}
            />
          </>
        ) : (
          <Text variant="labelMedium" style={{ textAlign: 'center', margin: 'auto' }}>
            {t('metrics.no-data')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

export default FootprintComparisonCard;
