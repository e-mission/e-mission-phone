import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';
import BikeDockEntryModal from '../js/library/components/BikeDockEntryModal';

describe('BikeDockEntryModal', () => {
  it('triggers scan callback and dismiss on scan press', () => {
    const onScan = jest.fn();
    const onManualSubmit = jest.fn();
    const onDismiss = jest.fn();

    const { getByText } = render(
      <BikeDockEntryModal
        visible={true}
        onDismiss={onDismiss}
        onScan={onScan}
        onManualSubmit={onManualSubmit}
      />,
    );

    fireEvent.press(getByText('Scan QR code'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onManualSubmit).not.toHaveBeenCalled();
  });

  it('submits manual id after typing and dismisses', () => {
    const onScan = jest.fn();
    const onManualSubmit = jest.fn();
    const onDismiss = jest.fn();

    const { UNSAFE_getByType, getByText } = render(
      <BikeDockEntryModal
        visible={true}
        onDismiss={onDismiss}
        onScan={onScan}
        onManualSubmit={onManualSubmit}
      />,
    );

    fireEvent.changeText(UNSAFE_getByType(PaperTextInput), 'emission://bike-123');
    fireEvent.press(getByText('Use typed ID'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onManualSubmit).toHaveBeenCalledWith('emission://bike-123');
    expect(onScan).not.toHaveBeenCalled();
  });

  it('does not hang when shown twice in quick succession', () => {
    const onScan = jest.fn();
    const onManualSubmit = jest.fn();
    const onDismiss = jest.fn();

    const { UNSAFE_getByType, getByText, rerender } = render(
      <BikeDockEntryModal
        visible={true}
        onDismiss={onDismiss}
        onScan={onScan}
        onManualSubmit={onManualSubmit}
      />,
    );

    // First open path: scan button
    fireEvent.press(getByText('Scan QR code'));

    // Close then immediately reopen with the same callbacks.
    rerender(
      <BikeDockEntryModal
        visible={false}
        onDismiss={onDismiss}
        onScan={onScan}
        onManualSubmit={onManualSubmit}
      />,
    );
    rerender(
      <BikeDockEntryModal
        visible={true}
        onDismiss={onDismiss}
        onScan={onScan}
        onManualSubmit={onManualSubmit}
      />,
    );

    // Second open path: manual entry still works.
    fireEvent.changeText(UNSAFE_getByType(PaperTextInput), 'emission://bike-456');
    fireEvent.press(getByText('Use typed ID'));

    expect(onScan).toHaveBeenCalledTimes(1);
    expect(onManualSubmit).toHaveBeenCalledWith('emission://bike-456');
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});
