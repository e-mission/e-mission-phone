/* A presentational component that accepts a time (and optional date) and displays them in a badge
  Used in the label screen, on the trip, place, and/or untracked cards */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Badge, BadgeProps, Text, useTheme } from 'react-native-paper';

type Props = BadgeProps & {
  lightBg: boolean;
  time: string;
  date?: string;
};
const TimestampBadge = ({ lightBg, time, date, ...otherProps }: Props) => {
  const { colors } = useTheme();
  const bgColor = lightBg ? colors.primaryContainer : colors.primary;
  const textColor = lightBg ? 'black' : 'white';

  return (
    // @ts-ignore Technically, Badge only accepts a string or number as its child, but we want
    // to have different bold & light text styles for the time and date, so we pass in Text components.
    // It works fine with Text components inside, so let's ignore the type error.
    <Badge style={{ backgroundColor: bgColor, ...styles.badge }} {...otherProps}>
      <Text style={{ color: textColor, ...styles.time }}>{time}</Text>
      {
        /* if date is not passed as prop, it will not be shown */
        date && (
          <Text style={{ color: textColor, ...styles.date }}>
            {`\xa0(${date})` /* date shown in parentheses with space before */}
          </Text>
        )
      }
    </Badge>
  );
};
const styles = StyleSheet.create({
  badge: {
    flex: 1,
    paddingHorizontal: 6,
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
