/* A component wrapped around a <select> element that allows the user to pick a filter,
    used in the Label screen.
  This is a temporary solution; this component includes HTML and we will need to be rewritten
    when we have fully migrated to React Native.
*/

import React, { useEffect, useState } from "react";
import { angularize } from "../angular-react-helper";
import { useTranslation } from "react-i18next";
import { array, number } from "prop-types";

const FilterSelect = ({ filters, setFilters, numListDisplayed, numListTotal }) => {

  const { t } = useTranslation();
  const [selectedFilter, setSelectedFilter] = useState('show-all');

  useEffect(() => {
    setSelectedFilter(filters?.find(f => f.state)?.key);
  }, []);

  useEffect(() => {
    if (selectedFilter === 'show-all') {
      setFilters(filters.map(f => ({ ...f, state: false })));
    } else {
      setFilters(filters.map(f => {
        if (f.key === selectedFilter) {
          return { ...f, state: true };
        } else {
          return { ...f, state: false };
        }
      }));
    }
  }, [selectedFilter]);

  const selectStyle = s.select;
  if (!filters)
    selectStyle.pointerEvents = 'none';

  return (
    <select style={selectStyle}
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}>
      {filters.map((filter, i) =>
        <option value={filter.key} key={i}>
          {`${filter.text} ${selectedFilter == filter.key && numListDisplayed ?
            '(' + numListDisplayed + '/' + numListTotal + ')' : ''}`
          }
        </option>
      )}
      <option value="show-all">
        {`${t('diary.show-all')} (${numListTotal})`}
      </option>
    </select>
  );
};

/* using 'any' here because React Native doesn't have types
  for some of these CSS props */
const s: any = {
  select: {
    minHeight: 34,
    appearance: 'button',
    WebkitAppearance: 'button',
    borderRadius: 10,
    margin: 8,
    fontSize: 13,
    flexGrow: 0,
    color: '#222',
    border: '1px solid rgb(20 20 20 / .2)',
  }
}

FilterSelect.propTypes = {
  filters: array,
  numListDisplayed: number,
  numListTotal: number,
}

angularize(FilterSelect, 'emission.main.diary.filterselect');
export default FilterSelect;
