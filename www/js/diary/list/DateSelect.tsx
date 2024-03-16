/* This button launches a modal to select a date, which determines which week of
    travel should be displayed in the Label screen.
  The button itself is a NavBarButton, which shows the currently selected date range,
    a calendar icon, and launches the modal when clicked.
  The modal is a DatePickerModal from react-native-paper-dates, which shows a calendar
    and allows the user to select a date.
*/

import React, { useEffect, useState, useMemo, useContext } from 'react';
import { StyleSheet } from 'react-native';
import { DateTime } from 'luxon';
import LabelTabContext from '../LabelTabContext';
import { DatePickerModal } from 'react-native-paper-dates';
import { Text, Divider, useTheme } from 'react-native-paper';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import { NavBarButton } from '../../components/NavBar';

const DateSelect = ({ tsRange, loadSpecificWeekFn }) => {
  const { pipelineRange } = useContext(LabelTabContext);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [dateRange, setDateRange] = useState([null, null]);
  const [selDate, setSelDate] = useState<Date>(new Date());
  const minMaxDates = useMemo(() => {
    if (!pipelineRange) return { startDate: new Date(), endDate: new Date() };
    return {
      startDate: new Date(pipelineRange?.start_ts * 1000),
      endDate: new Date(pipelineRange?.end_ts * 1000),
    };
  }, [pipelineRange]);

  useEffect(() => {
    if (!pipelineRange || !tsRange.oldestTs) return;
    const displayStartTs = Math.max(tsRange.oldestTs, pipelineRange.start_ts);
    const displayStartDate = DateTime.fromSeconds(displayStartTs).toLocaleString(
      DateTime.DATE_SHORT,
    );

    let displayEndDate;
    if (tsRange.latestTs < pipelineRange.end_ts) {
      displayEndDate = DateTime.fromSeconds(tsRange.latestTs).toLocaleString(DateTime.DATE_SHORT);
    }
    setDateRange([displayStartDate, displayEndDate]);

    const mid = (tsRange.oldestTs + tsRange.latestTs) / 2;
    const d = new Date(Math.min(mid, pipelineRange.end_ts) * 1000);
    setSelDate(d);
  }, [tsRange]);

  const onDismissSingle = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const onChoose = React.useCallback(
    (params) => {
      loadSpecificWeekFn(params.date);
      setOpen(false);
    },
    [setOpen, loadSpecificWeekFn],
  );
  const dateRangeEnd = dateRange[1] || t('diary.today');
  return (
    <>
      <NavBarButton
        icon="calendar"
        accessibilityLabel={
          'Date range: ' + (dateRange[0] ? dateRange[0] + ' to ' : '') + dateRangeEnd
        }
        onPress={() => setOpen(true)}>
        {dateRange[0] && (
          <>
            <Text>{dateRange[0]}</Text>
            <Divider
              horizontalInset={true}
              style={[s.divider, { backgroundColor: colors.onBackground }]}
            />
          </>
        )}
        <Text>{dateRangeEnd}</Text>
      </NavBarButton>
      <DatePickerModal
        locale={i18next.resolvedLanguage || 'en'}
        animationType="slide"
        mode="single"
        visible={open}
        date={selDate}
        validRange={minMaxDates}
        onDismiss={onDismissSingle}
        onChange={onChoose}
        onConfirm={onDismissSingle}
      />
    </>
  );
};

export const s = StyleSheet.create({
  divider: {
    width: 25,
    marginHorizontal: 'auto',
  },
});

export default DateSelect;
