import React, { useState } from 'react';
import { Modal, ModalProps, View, StyleSheet } from 'react-native';
import { Button, Dialog, Text, TextInput } from 'react-native-paper';

type Props = Omit<ModalProps, 'children'> & {
  onScan?: () => void;
  onManualSubmit?: (bikeId: string) => void;
};

const BikeDockEntryModal = ({ onScan, onManualSubmit, ...props }: Props) => {
  const [manualId, setManualId] = useState('');

  return (
    <Modal transparent={true} {...props}>
      <Dialog visible={Boolean(props.visible)} onDismiss={props.onDismiss}>
        <Dialog.Title>Enter bike information</Dialog.Title>
        <Dialog.Content>
          <View style={styles.content}>
            <Text>Choose how you want to enter the bike/dock id.</Text>
            <Button
              mode="outlined"
              onPress={() => {
                props.onDismiss?.();
                onScan?.();
              }}>
              Scan QR code
            </Button>
            <TextInput
              label="Id"
              value={manualId}
              onChangeText={setManualId}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={props.onDismiss}>Close</Button>
          <Button
            mode="contained"
            disabled={!manualId.trim()}
            onPress={() => {
              const enteredId = manualId.trim();
              props.onDismiss?.();
              onManualSubmit?.(enteredId);
            }}>
            Use typed ID
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
});

export default BikeDockEntryModal;
