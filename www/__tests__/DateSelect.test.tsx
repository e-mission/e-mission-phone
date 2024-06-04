import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import DateSelect from '../js/diary/list/DateSelect';
import { DateTime } from 'luxon';
import TimelineContext from '../js/TimelineContext';

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
    end_ts: DateTime.local().set({ month: 5, day: 30 }).endOf('day').toSeconds(),
  };

  const queriedDateRangeMock = [
    DateTime.local().set({ month: 5, day: 20 }).startOf('day').toISO(),
    DateTime.local().set({ month: 5, day: 30 }).endOf('day').toISO(),
  ];

  const contextValue = {
    pipelineRange: pipelineRangeMock,
    queriedDateRange: queriedDateRangeMock,
  };

  it('renders correctly DatePickerModal after clicking the button', async () => {
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
    // Todo : check if DatePickerModal opens correctly
    // await waitFor(() => {
    //   expect(screen.getByText('Save')).toBeTruthy();
    // });
  });
});
