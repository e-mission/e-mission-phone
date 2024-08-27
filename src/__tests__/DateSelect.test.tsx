import React from 'react';
import { render, screen } from '@testing-library/react-native';
import DateSelect from '../js/diary/list/DateSelect';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 30, left: 0, right: 0, top: 30 }),
}));
jest.spyOn(React, 'useState').mockImplementation((initialValue) => [initialValue, jest.fn()]);
jest.spyOn(React, 'useEffect').mockImplementation((effect: () => void) => effect());

describe('DateSelect', () => {
  it('renders correctly', () => {
    const onChooseMock = jest.fn();
    const { getByText } = render(<DateSelect mode="range" onChoose={onChooseMock} />);

    expect(screen.getByTestId('button-container')).toBeTruthy();
    expect(screen.getByTestId('button')).toBeTruthy();
  });
});
