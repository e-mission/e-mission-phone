import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import CheckoutControlModal from '../js/library/components/CheckoutControlModal';

describe('CheckoutControlModal', () => {
  it('confirms with default (no accessories) and dismisses', () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    const { getByText } = render(
      <CheckoutControlModal visible={true} onDismiss={onDismiss} onConfirm={onConfirm} />,
    );

    fireEvent.press(getByText('Confirm'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith(false);
  });

  it('toggles accessories and confirms true', () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    const { getByText } = render(
      <CheckoutControlModal visible={true} onDismiss={onDismiss} onConfirm={onConfirm} />,
    );

    fireEvent.press(getByText('Include accessories in the rental'));
    fireEvent.press(getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledWith(true);
  });

  it('does not hang when shown twice in quick succession', () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    const { getByText, rerender } = render(
      <CheckoutControlModal visible={true} onDismiss={onDismiss} onConfirm={onConfirm} />,
    );

    // First open path: toggle accessories and confirm.
    fireEvent.press(getByText('Include accessories in the rental'));
    fireEvent.press(getByText('Confirm'));

    // Close then immediately reopen.
    rerender(<CheckoutControlModal visible={false} onDismiss={onDismiss} onConfirm={onConfirm} />);
    rerender(<CheckoutControlModal visible={true} onDismiss={onDismiss} onConfirm={onConfirm} />);

    // Confirm again to ensure second render is interactive.
    fireEvent.press(getByText('Confirm'));

    expect(onDismiss).toHaveBeenCalledTimes(2);
    expect(onConfirm).toHaveBeenNthCalledWith(1, true);
    expect(onConfirm).toHaveBeenNthCalledWith(2, expect.any(Boolean));
  });
});
