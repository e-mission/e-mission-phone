import React, { useState } from 'react';
import { Modal, ModalProps } from 'react-native';
import { Button, Checkbox, Dialog, Text } from 'react-native-paper';

type Props = Omit<ModalProps, 'children'> & {
  onConfirm?: (wantAccessories: boolean) => void;
};

const CheckoutControlModal = ({ onConfirm, ...props }: Props) => {
  const [wantAccessories, setWantAccessories] = useState(false);
  const holdAmount = wantAccessories ? 25000 : 20000;
  const holdDisplay = (holdAmount / 100).toFixed(2);
  const confirmText = wantAccessories
    ? `We will place a hold of $${holdDisplay} on your account for the bike and accessories. Please confirm.`
    : `We will place a hold of $${holdDisplay} on your account for the bike. Please confirm.`;

  return (
    <Modal transparent={true} {...props}>
      <Dialog visible={Boolean(props.visible)} onDismiss={props.onDismiss}>
        <Dialog.Title>Confirm checkout</Dialog.Title>
        <Dialog.Content>
          <Text>{confirmText}</Text>
          <Checkbox.Item
            label="Include accessories in the rental"
            status={wantAccessories ? 'checked' : 'unchecked'}
            onPress={() => setWantAccessories((prev) => !prev)}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={props.onDismiss}>Close</Button>
          <Button
            mode="contained"
            onPress={() => {
              props.onDismiss?.();
              onConfirm?.(wantAccessories);
            }}>
            Confirm
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

export default CheckoutControlModal;
