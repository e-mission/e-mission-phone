/* A presentational component that accepts a time (and optional date) and displays them in a badge
  Used in the label screen, on the trip, place, and/or untracked cards */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";

type Props = {
  lightBg: boolean,
  time: string,
  date?: string,
};
const TimestampBadge = ({ lightBg, time, date, ...otherProps }: Props) => {
  const { colors } = useTheme();
  const bgColor = lightBg ? colors.primaryContainer : colors.primary;
  const textColor = lightBg ? 'black' : 'white';

  return (
    <View style={{backgroundColor: bgColor, borderColor: colors.primary, ...styles.badge}} {...otherProps}>
      <Text style={{color: textColor, ...styles.time}}>
        {time}
      </Text>
      {/* if date is not passed as prop, it will not be shown */
      date && <Text style={{color: textColor, ...styles.date}}>
        {`\xa0(${date})` /* date shown in parentheses with space before */}
      </Text>}
    </View>
  );
};
const styles = StyleSheet.create({
  badge: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 6,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 12.5,
    display: 'flex',
    margin: 'auto',
    alignItems: 'center',
    maxHeight: 20,
    lineHeight: 18,
  },
  time: {
    fontWeight: '500', // medium / semibold
  },
  date: {
    fontWeight: '300', // light
  },
});

export default TimestampBadge;
