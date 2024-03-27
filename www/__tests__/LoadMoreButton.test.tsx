/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import LoadMoreButton from '../js/diary/list/LoadMoreButton';

describe('LoadMoreButton', () => {
  it('renders correctly', async () => {
    render(<LoadMoreButton onPressFn={() => {}}>{}</LoadMoreButton>);
    await waitFor(() => {
      expect(screen.getByTestId('load-button')).toBeTruthy();
    });
  }, 15000);

  it('calls onPressFn when clicked', async () => {
    const mockFn = jest.fn();
    const { getByTestId } = render(<LoadMoreButton onPressFn={mockFn}>{}</LoadMoreButton>);
    const loadButton = getByTestId('load-button');
    fireEvent.press(loadButton);
    await waitFor(() => {
      expect(mockFn).toHaveBeenCalled();
    });
  }, 15000);
});
