/* This button launches a modal to select a date range, which determines what time period
    for which metrics should be displayed.
  The button itself is a NavBarButton, which shows the currently selected date range,
    a calendar icon, and launches the modal when clicked.
  The modal is a DatePickerModal from react-native-paper-dates, which shows a calendar
    and allows the user to select a date.
*/

import React, { useState, useCallback, useMemo } from "react";
import { Text, StyleSheet } from "react-native";
import { DatePickerModal } from "react-native-paper-dates";
import { Divider, useTheme } from "react-native-paper";
import i18next from "i18next";
import { useTranslation } from "react-i18next";
import NavBarButton from "../components/NavBarButton";
import { DateTime } from "luxon";

type Props = {
  dateRange: DateTime[],
  setDateRange: (dateRange: [DateTime, DateTime]) => void,
}
const MetricsDateSelect = ({ dateRange, setDateRange }: Props) => {

  const { t } = useTranslation();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const todayDate = useMemo(() => new Date(), []);
  const dateRangeAsJSDate = useMemo(() =>
    [ dateRange[0].toJSDate(), dateRange[1].toJSDate() ],
  [dateRange]);

  const onDismiss = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const onChoose = useCallback(({ startDate, endDate }) => {
    setOpen(false);
    setDateRange([
      DateTime.fromJSDate(startDate).startOf('day'),
      DateTime.fromJSDate(endDate).startOf('day')
    ]);
  }, [setOpen, setDateRange]);

  return (<>
    <NavBarButton icon="calendar" onPressAction={() => setOpen(true)}>
      {dateRange[0] && (<>
        <Text>{dateRange[0].toLocaleString()}</Text>
        <Divider horizontalInset={true} style={[s.divider, { backgroundColor: colors.onBackground }]} />
      </>)}
    <Text>{dateRange[1]?.toLocaleString() || t('diary.today')}</Text>
    </NavBarButton>
    <DatePickerModal locale={i18next.resolvedLanguage || 'en'}
      animationType="slide"
      mode="range"
      visible={open}
      startDate={dateRangeAsJSDate[0]}
      endDate={dateRangeAsJSDate[1]}
      validRange={{endDate: todayDate}}
      onDismiss={onDismiss}
      onConfirm={onChoose} />
  </>);
};

export const s = StyleSheet.create({
  divider: {
    width: '3ch',
    marginHorizontal: 'auto',
  }
});

export default MetricsDateSelect;
