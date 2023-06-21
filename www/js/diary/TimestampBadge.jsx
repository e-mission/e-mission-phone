/* A presentational component that accepts a time (and optional date) and displays them in a badge
  Used in the label screen, on the trip, place, and/or untracked cards */

import React from "react";
import { angularize } from "../angular-react-helper";
import { bool, string } from "prop-types";
import { Badge, Text, useTheme } from "react-native-paper";

const TimestampBadge = ({ lightBg, time, date=null, ...otherProps }) => {
  const { colors } = useTheme();
  const bgColor = lightBg ? colors.primaryContainer : colors.primary;
  const textColor = lightBg ? 'black' : 'white';

  return (
    <Badge style={{backgroundColor: bgColor, ...styles.badge}} {...otherProps}>
      <Text style={{color: textColor, ...styles.time}}>
        {time}
      </Text>
      {/* if date is not passed as prop, it will not be shown */
      date && <Text style={{color: textColor, ...styles.date}}>
        {`\xa0(${date})` /* date shown in parentheses with space before */}
      </Text>}
    </Badge>
  );
};
const styles = {
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
    fontWeight: 500, // medium / semibold
  },
  date: {
    fontWeight: 300, // light
  }
}
TimestampBadge.propTypes = {
  lightBg: bool,
  time: string,
  date: string
}

export default TimestampBadge;
