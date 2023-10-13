/**
 * @jest-environment jsdom
 */
import React from 'react'
import {render, fireEvent, waitFor, screen} from '@testing-library/react-native'
import LoadMoreButton from '../js/diary/list/LoadMoreButton'


describe("LoadMoreButton", () => {
  it("renders correctly", async () => {
    render(
      <LoadMoreButton onPressFn={() => {}}>{}</LoadMoreButton>
    );
    await waitFor(() => {
      expect(screen.getByTestId("load-button")).toBeTruthy();
    });
  });

  it("calls onPressFn when clicked", () => {
    const mockFn = jest.fn();
    const { getByTestId } = render(
      <LoadMoreButton onPressFn={mockFn}>{}</LoadMoreButton>
    );
    const loadButton = getByTestId("load-button");
    fireEvent.press(loadButton);
    expect(mockFn).toHaveBeenCalled();
  });
});


