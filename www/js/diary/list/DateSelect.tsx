/* A component wrapped around an <input> element that allows the user to pick a date,
    used in the Label screen.
  This is a temporary solution; this component includes HTML and we will need to be rewritten
    when we have fully migrated to React Native.
*/

import React, { useEffect, useState } from "react";
import { angularize } from "../../angular-react-helper";
import { func, object } from "prop-types";
import moment from "moment";

const DateSelect = ({ tsRange, loadSpecificWeekFn }) => {

  const [dateRange, setDateRange] = useState('-\n-');
  const [selDate, setSelDate] = useState('-');

  useEffect(() => {
    if (!tsRange.oldestTs) return;
    const start = moment.unix(tsRange.oldestTs).format('YYYY-MM-DD');
    const end = moment.unix(tsRange.latestTs).format('YYYY-MM-DD');
    setDateRange(start + '\n' + end);
    const mid = moment.unix((tsRange.oldestTs + tsRange.latestTs) / 2).format('YYYY-MM-DD');
    setSelDate(mid);
  }, [tsRange]);

  return (
    <div style={s.wrapper}>
      <span style={s.text}>{dateRange}</span>
      <input type="date" value={selDate}
              onChange={(e) => loadSpecificWeekFn(e.target.value)}
              style={s.input} />
      <hr style={s.divider} />
      <span style={s.icon}></span>
    </div>
  );
};

/* using 'any' here because React Native doesn't have types
  for some of these CSS props */
const s: any = {
  wrapper: {
    height: 34,
    position: 'relative',
    marginRight: 'auto',
    color: '#222',
  },
  input: {
    color: 'transparent',
    appearance: 'button',
    WebkitAppearance: 'button',
    borderRadius: 10,
    fontSize: 13,
    border: '1px solid rgb(20 20 20 / .2)',
    paddingLeft: 10,
    paddingRight: 10,
    minWidth: '10ch',
  },
  divider: {
    pointerEvents: 'none',
    position: 'absolute',
    color: 'black',
    borderTop: '1px solid #444',
    top: '50%',
    margin: 0,
    width: '3ch',
    left: 'calc(50% - 7px)',
    transform: 'translate(-50%)',
  },
  text: {
    pointerEvents: 'none',
    position: 'absolute',
    left: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 12,
    lineHeight: 1.25,
    width: 'calc(100% - 15px)',
    whiteSpace: 'pre-line',
    textAlign: 'center',
  },
  icon: {
    pointerEvents: 'none',
    position: 'absolute',
    fontFamily: 'Ionicons',
    right: 5,
    top: '50%',
    transform: 'translateY(-50%)',
  }
};

export default DateSelect;
