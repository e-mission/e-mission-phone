import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import DateSelect from '../js/diary/list/DateSelect';
import { DateTime } from 'luxon';
import TimelineContext from '../js/TimelineContext';
import initializedI18next from '../js/i18nextInit';
window['i18next'] = initializedI18next;

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 30, left: 0, right: 0, top: 30 }),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
}));

describe('DateSelect', () => {
  const pipelineRangeMock = {
    start_ts: DateTime.local().set({ month: 5, day: 20 }).startOf('day').toSeconds(),
    end_ts: DateTime.local()
      .set({ month: 5, day: 30 })
      .endOf('day')
      .set({ millisecond: 0 })
      .toSeconds(),
  };

  const queriedDateRangeMock = [
    DateTime.local().set({ month: 5, day: 20 }).startOf('day').toISO(),
    DateTime.local().set({ month: 5, day: 30 }).endOf('day').set({ millisecond: 0 }).toISO(),
  ];

  const contextValue = {
    pipelineRange: pipelineRangeMock,
    queriedDateRange: queriedDateRangeMock,
  };

  it('renders correctly DatePickerModal after clicking the button and save date correctly', async () => {
    const onChooseMock = jest.fn();
    render(
      <TimelineContext.Provider value={contextValue}>
        <DateSelect mode="range" onChoose={onChooseMock} />
      </TimelineContext.Provider>,
    );

    // check if DateSelect rendered correctly
    expect(screen.getByTestId('button-container')).toBeTruthy();
    expect(screen.getByTestId('button')).toBeTruthy();
    expect(screen.getByText('5/20/2024')).toBeTruthy();

    fireEvent.press(screen.getByTestId('button'));
    await waitFor(() => {
      // 'save' and 'close' buttons should pop up correctly after DateSelect Modal Opens
      expect(screen.getByTestId('react-native-paper-dates-close')).toBeTruthy();
      expect(screen.getByTestId('react-native-paper-dates-save-text')).toBeTruthy();
    });

    // check if date changes corretly
    // Start Date : 05/20/24 -> 05/25/2024
    fireEvent.changeText(screen.getAllByTestId('text-input-flat')[0], '05/25/2024');
    expect(screen.queryByDisplayValue('May 20')).toBeNull();
    expect(screen.getByText('May 25')).toBeTruthy();
    // End Date : 05/30/24 -> 05/28/2024
    fireEvent.changeText(screen.getAllByTestId('text-input-flat')[1], '05/28/2024');
    expect(screen.queryByDisplayValue('May 30')).toBeNull();
    expect(screen.getByText('May 28')).toBeTruthy();

    // check if onChoose function gets called with changed dates after clicking 'save' button.
    fireEvent.press(screen.getByTestId('react-native-paper-dates-save-text'));
    const expectedParams = {
      startDate: DateTime.local().set({ month: 5, day: 25 }).startOf('day').toJSDate(),
      endDate: DateTime.local()
        .set({ month: 5, day: 28 })
        .endOf('day')
        .set({ millisecond: 0 })
        .toJSDate(),
    };
    expect(onChooseMock).toHaveBeenCalledWith(expectedParams);
  });
});
