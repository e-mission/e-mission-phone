import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { Button, TextInput, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { Alerts } from '../../components/AlertArea';
import { addStatReading } from '../../plugin/clientStats';
import { logDebug } from '../../plugin/logger';

let barcodeScannerIsOpen = false;

function runQrScan(callback: (resultText: string) => void) {
  if (barcodeScannerIsOpen) return;

  if (!(window as any)?.cordova?.plugins?.barcodeScanner) {
    Alerts.addMessage({ text: i18next.t('library.qr-scanner.not-available') });
    return;
  }

  barcodeScannerIsOpen = true;
  addStatReading('open_qr_scanner');
  (window as any).cordova.plugins.barcodeScanner.scan(
    (result: { cancelled?: boolean; text?: string; format?: string }) => {
      barcodeScannerIsOpen = false;
      logDebug('scanCode: scanned ' + JSON.stringify(result));
      if (result.cancelled) return;
      if (!result?.text || result.format != 'QR_CODE') {
        Alerts.addMessage({ text: i18next.t('library.qr-scanner.no-qr-found') });
        return;
      }
      callback(result.text);
    },
    (error: { message?: string }) => {
      barcodeScannerIsOpen = false;
      const message = error.message || i18next.t('library.qr-scanner.unknown-error');
      Alerts.addMessage({ text: i18next.t('library.qr-scanner.scan-failed', { error: message }) });
      callback(message);
    },
  );
}

interface QRScannerProps {
  mode: 'checkout' | 'return';
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ mode, onScan, onClose }: QRScannerProps) {
  const { t } = useTranslation();
  const [manualCode, setManualCode] = useState('');

  const handleManualSubmit = () => {
    const trimmed = manualCode.trim();
    if (trimmed) onScan(trimmed);
  };

  return (
    <Modal animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {mode === 'checkout'
                ? t('library.qr-scanner.scan-vehicle-title')
                : t('library.qr-scanner.scan-dock-title')}
            </Text>
            <IconButton icon="close" onPress={onClose} />
          </View>

          <Button
            mode="contained"
            icon="camera-outline"
            onPress={() => runQrScan(onScan)}
            style={styles.cameraButton}
            contentStyle={styles.cameraButtonContent}>
            {t('library.qr-scanner.open-camera')}
          </Button>

          <View style={styles.manualSection}>
            <Text style={styles.manualLabel}>{t('library.qr-scanner.manual-label')}</Text>
            <View style={styles.inputRow}>
              <TextInput
                mode="outlined"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={
                  mode === 'checkout'
                    ? t('library.qr-scanner.vehicle-id-placeholder')
                    : t('library.qr-scanner.dock-id-placeholder')
                }
                right={
                  <TextInput.Icon
                    onPress={handleManualSubmit}
                    icon="arrow-right"
                    testID="qr-manual-submit"
                  />
                }
                style={styles.input}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '100%',
    maxWidth: 500,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  cameraButton: {
    marginBottom: 16,
  },
  cameraButtonContent: {
    paddingVertical: 8,
  },
  manualSection: {
    marginBottom: 8,
  },
  manualLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
  },
  submitButton: {
    justifyContent: 'center',
  },
  quickTest: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
    marginTop: 16,
  },
  quickTestLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  mockButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mockButton: {
    marginBottom: 8,
  },
});

export default QRScanner;
