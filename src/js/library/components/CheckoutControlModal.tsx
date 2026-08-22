import React, { useState } from 'react';
import { Button, Dialog, Text } from 'react-native-paper';

type Props = {
  visible?: boolean;
  onDismiss?: () => void;
  onConfirm?: (wantAccessories: boolean, holdAmount: number) => void;
};

const CheckoutControlModal = ({ onConfirm, visible, onDismiss }: Props) => {
  const [wantAccessories, setWantAccessories] = useState(false);
  const holdAmount = wantAccessories ? 38000 : 38000;
  const holdDisplay = (holdAmount / 100).toFixed(2);
  const confirmText = wantAccessories
    ? `We will place a hold of $${holdDisplay} on your account for the bike and accessories. Please confirm.`
    : `We will place a hold of $${holdDisplay} on your account for the bike. Please confirm.`;

  return (
    <Dialog visible={Boolean(visible)} onDismiss={onDismiss}>
      <Dialog.Title>Confirm checkout</Dialog.Title>
      <Dialog.Content>
        <Text>{confirmText}</Text>
        <Button
          mode={wantAccessories ? 'contained' : 'outlined'}
          onPress={() => setWantAccessories((prev) => !prev)}>
          Include accessories in the rental
        </Button>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss}>Close</Button>
        <Button
          mode="contained"
          onPress={() => {
            onDismiss?.();
            onConfirm?.(wantAccessories, holdAmount);
          }}>
          Confirm
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

export default CheckoutControlModal;
