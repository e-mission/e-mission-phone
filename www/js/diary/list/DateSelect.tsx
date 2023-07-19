/* A component wrapped around an <input> element that allows the user to pick a date,
    used in the Label screen.
  This is a temporary solution; this component includes HTML and we will need to be rewritten
    when we have fully migrated to React Native.
*/

import React, { useEffect, useState, useMemo, useContext } from "react";
import { Text, StyleSheet } from "react-native";
import moment from "moment";
import { LabelTabContext } from "../LabelTab";
import { DatePickerModal } from "react-native-paper-dates";
import { Divider, useTheme } from "react-native-paper";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import NavBarButton from "../../components/NavBarButton";

const DateSelect = ({ tsRange, loadSpecificWeekFn }) => {

  const { pipelineRange } = useContext(LabelTabContext);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [dateRange, setDateRange] = useState(['-', '-']);
  const [selDate, setSelDate] = useState(null);
  const minMaxDates = useMemo(() => ({
    startDate: new Date(pipelineRange?.start_ts * 1000),
    endDate: new Date(pipelineRange?.end_ts * 1000),
  }), [pipelineRange]);

  useEffect(() => {
    if (!tsRange.oldestTs) return;
    const displayStartTs = Math.max(tsRange.oldestTs, pipelineRange.start_ts);
    const displayStartDate = moment.unix(displayStartTs).format('L');

    let displayEndDate;
    if (tsRange.latestTs < pipelineRange.end_ts) {
      displayEndDate = moment.unix(tsRange.latestTs).format('L');
    } else {
      displayEndDate = t('diary.today');
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
    [setOpen, loadSpecificWeekFn]
  );
  return (<>
    <NavBarButton icon="calendar" onPressAction={() => setOpen(true)}>
      <Text>{dateRange[0]}</Text>
      <Divider horizontalInset={true} style={[s.divider, { backgroundColor: colors.onBackground }]} />
      <Text>{dateRange[1]}</Text>
    </NavBarButton>
    <DatePickerModal locale={i18next.resolvedLanguage || 'en'}
      animationType="slide"
      mode="single"
      visible={open}
      date={selDate}
      validRange={minMaxDates}
      onDismiss={onDismissSingle}
      onChange={onChoose} />
  </>);
};

export const s = StyleSheet.create({
  divider: {
    width: '3ch',
    marginHorizontal: 'auto',
  }
});

export default DateSelect;
