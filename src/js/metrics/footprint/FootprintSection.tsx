import React, { useContext, useMemo, useState } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import color from 'color';
import SummaryCard from '../SummaryCard';
import { useTranslation } from 'react-i18next';
import { sumMetricEntries } from '../metricsHelper';
import TimelineContext from '../../TimelineContext';
import { formatIso, isoDatesDifference } from '../../datetimeUtil';
import WeeklyFootprintCard from './WeeklyFootprintCard';
import useAppConfig from '../../useAppConfig';
import { getFootprintGoals } from './footprintHelper';
import FootprintComparisonCard from './FootprintComparisonCard';

const FootprintSection = ({ userMetrics, aggMetrics, metricList }) => {
  const { t } = useTranslation();
  const appConfig = useAppConfig();
  const { queriedDateRange } = useContext(TimelineContext);

  const [footnotes, setFootnotes] = useState<string[]>([]);

  function addFootnote(note: string) {
    const i = footnotes.findIndex((n) => n == note);
    let footnoteNumber: number;
    const superscriptDigits = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    if (i >= 0) {
      footnoteNumber = i + 1;
    } else {
      setFootnotes([...footnotes, note]);
      footnoteNumber = footnotes.length + 1;
    }
    return footnoteNumber
      .toString()
      .split('')
      .map((d) => superscriptDigits[parseInt(d)])
      .join('');
  }

  const userCumulativeFootprint = useMemo(
    () =>
      userMetrics?.footprint?.length ? sumMetricEntries(userMetrics?.footprint, 'footprint') : null,
    [userMetrics?.footprint],
  );

  const groupCumulativeFootprint = useMemo(
    () =>
      aggMetrics?.footprint?.length ? sumMetricEntries(aggMetrics?.footprint, 'footprint') : null,
    [aggMetrics?.footprint],
  );

  const goals = getFootprintGoals(appConfig, addFootnote);

  // defaults to true if not defined in config
  const showUncertainty =
    appConfig?.metrics?.phone_dashboard_ui?.footprint_options?.unlabeled_uncertainty !== false;

  if (!queriedDateRange) return null;
  const nDays = isoDatesDifference(...queriedDateRange) + 1;

  return (
    <>
      <View>
        <Text variant="titleMedium">{t('metrics.footprint.estimated-footprint')}</Text>
        <Text variant="bodyMedium">{`${formatIso(...queriedDateRange)} (${nDays} days)`}</Text>
      </View>
      {userCumulativeFootprint && (
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <SummaryCard
            title={t('metrics.footprint.ghg-emissions')}
            unit="kg"
            value={[
              userCumulativeFootprint?.kg_co2,
              userCumulativeFootprint?.kg_co2 + (userCumulativeFootprint?.kg_co2_uncertain || 0),
            ]}
            nDays={nDays}
            goals={goals['carbon'] || []}
          />
          <SummaryCard
            title={t('metrics.footprint.energy-usage')}
            unit="kWh"
            value={[
              userCumulativeFootprint?.kwh,
              userCumulativeFootprint?.kwh + (userCumulativeFootprint?.kwh_uncertain || 0),
            ]}
            nDays={nDays}
            goals={goals['energy'] || []}
          />
        </View>
      )}
      <WeeklyFootprintCard
        type="carbon"
        unit="kg_co2"
        title={t('metrics.footprint.daily-emissions-by-week')}
        axisTitle={t('metrics.footprint.kg-co2e-per-day')}
        {...{ goals, addFootnote, showUncertainty, userMetrics, metricList }}
      />
      <WeeklyFootprintCard
        type="energy"
        unit="kwh"
        title={t('metrics.footprint.daily-energy-by-week')}
        axisTitle={t('metrics.footprint.kwh-per-day')}
        {...{ goals, addFootnote, showUncertainty, userMetrics, metricList }}
      />
      <FootprintComparisonCard
        type="carbon"
        unit="kg_co2"
        title={t('metrics.footprint.daily-emissions-comparison')}
        axisTitle={t('metrics.footprint.kg-co2e-per-day')}
        {...{
          userCumulativeFootprint,
          groupCumulativeFootprint,
          goals,
          addFootnote,
          showUncertainty,
          nDays,
        }}
      />
      <FootprintComparisonCard
        type="energy"
        unit="kwh"
        title={t('metrics.footprint.daily-energy-comparison')}
        axisTitle={t('metrics.footprint.kwh-per-day')}
        {...{
          userCumulativeFootprint,
          groupCumulativeFootprint,
          goals,
          addFootnote,
          showUncertainty,
          nDays,
        }}
      />
      {footnotes.length && (
        <View>
          {footnotes.map((note, i) => (
            <View key={i} style={{ flexDirection: 'row', padding: 5, gap: 3 }}>
              <Text variant="labelSmall">{addFootnote(note)}</Text>
              <Text variant="bodySmall">{note}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
};

export default FootprintSection;
