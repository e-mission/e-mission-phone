/* This button reflects what date range for which the timeline is currently loaded.
  If mode is 'single', one date can be selected; if 'range', start and end dates can be selected.
  The button itself is a NavBarButton, which shows the currently loaded date range,
    a calendar icon, and launches the modal when clicked.
  The modal is a DatePickerModal from react-native-paper-dates, which shows a calendar
    and allows the user to select date(s).
*/

import React, { useMemo, useContext } from 'react';
import { StyleSheet } from 'react-native';
import { DateTime } from 'luxon';
import TimelineContext from '../../TimelineContext';
import {
  DatePickerModal,
  DatePickerModalRangeProps,
  DatePickerModalSingleProps,
} from 'react-native-paper-dates';
import { Text, useTheme } from 'react-native-paper';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import { NavBarButton } from '../../components/NavBar';
import { formatIsoNoYear, isoDateRangeToTsRange } from '../../datetimeUtil';

// formats as e.g. 'Aug 1'
const MONTH_DAY_SHORT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
};

type Props = Partial<DatePickerModalSingleProps | DatePickerModalRangeProps> & {
  mode: 'single' | 'range';
  onChoose: (params) => void;
};
const DateSelect = ({ mode, onChoose, ...rest }: Props) => {
  const { pipelineRange, queriedDateRange } = useContext(TimelineContext);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = React.useState(false);
  const minMaxDates = useMemo(() => {
    if (!pipelineRange?.start_ts) return { startDate: new Date(), endDate: new Date() };
    return {
      startDate: new Date(pipelineRange?.start_ts * 1000), // start of pipeline
      endDate: new Date(), // today
    };
  }, [pipelineRange]);

  const queriedRangeAsJsDates = useMemo(
    () => queriedDateRange?.map((d) => DateTime.fromISO(d).toJSDate()),
    [queriedDateRange],
  );

  const displayDateText = useMemo(() => {
    if (!pipelineRange || !queriedDateRange?.[0]) {
      return ' – '; // en dash surrounded by em spaces
    }
    const displayDateRange = [...queriedDateRange];
    if (queriedDateRange[1] == DateTime.now().toISODate()) {
      displayDateRange[1] = t('diary.today');
    }
    return formatIsoNoYear(...displayDateRange);
  }, [pipelineRange, queriedDateRange]);

  const midpointDate = useMemo<Date | undefined>(() => {
    if (!pipelineRange || !queriedDateRange?.[0]) return undefined;
    const [queriedStartTs, queriedEndTs] = isoDateRangeToTsRange(queriedDateRange);
    const mid = (queriedStartTs + queriedEndTs) / 2;
    return new Date(Math.min(mid, pipelineRange.end_ts) * 1000);
  }, [queriedDateRange]);

  const onDismissSingle = React.useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  return (
    <>
      <NavBarButton
        icon="calendar"
        accessibilityLabel={'Date range: ' + displayDateText}
        onPress={() => setOpen(true)}>
        <Text>{displayDateText}</Text>
      </NavBarButton>
      <DatePickerModal
        locale={i18next.resolvedLanguage || 'en'}
        animationType="slide"
        mode={mode as any}
        visible={open}
        date={mode == 'single' ? midpointDate : undefined}
        startDate={mode == 'range' ? queriedRangeAsJsDates?.[0] : undefined}
        endDate={mode == 'range' ? queriedRangeAsJsDates?.[1] : undefined}
        validRange={minMaxDates}
        onDismiss={onDismissSingle}
        onChange={(params) => {
          if (mode == 'single') {
            onChoose(params);
            onDismissSingle();
          }
        }}
        onConfirm={(params) => {
          if (mode == 'range') {
            onChoose(params);
            onDismissSingle();
          } else {
            onDismissSingle();
          }
        }}
        {...rest}
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
