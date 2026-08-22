import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Dialog, Text, TextInput } from 'react-native-paper';

type Props = {
  visible?: boolean;
  onDismiss?: () => void;
  onScan?: () => void;
  onManualSubmit?: (bikeId: string) => void;
};

const BikeDockEntryModal = ({ onScan, onManualSubmit, visible, onDismiss }: Props) => {
  const [manualId, setManualId] = useState('');

  return (
    <Dialog visible={Boolean(visible)} onDismiss={onDismiss}>
      <Dialog.Title>Enter bike information</Dialog.Title>
      <Dialog.Content>
        <View style={styles.content}>
          <Text>Choose how you want to enter the bike/dock id.</Text>
          <Button
            mode="outlined"
            onPress={() => {
              onDismiss?.();
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
        <Button onPress={onDismiss}>Close</Button>
        <Button
          mode="contained"
          disabled={!manualId.trim()}
          onPress={() => {
            const enteredId = manualId.trim();
            onDismiss?.();
            onManualSubmit?.(enteredId);
          }}>
          Use typed ID
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 12,
  },
});

export default BikeDockEntryModal;
