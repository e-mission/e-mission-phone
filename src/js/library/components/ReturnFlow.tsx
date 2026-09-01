import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Button, Card, Icon } from 'react-native-paper';

interface ReturnFlowProps {
  vehicleId: string;
  dockId: string;
  vehicleName?: string;
  durationDisplay: string;
  feeDisplay: string;
  onConfirmReturn: () => Promise<void>;
  onComplete: () => void;
}

export function ReturnFlow({
  vehicleId,
  dockId,
  vehicleName,
  durationDisplay,
  feeDisplay,
  onConfirmReturn,
  onComplete,
}: ReturnFlowProps) {
  const [step, setStep] = useState<'confirm' | 'processing' | 'complete'>('confirm');

  const handleConfirmReturn = async () => {
    setStep('processing');
    try {
      await onConfirmReturn();
      setStep('complete');
    } catch {
      // error is already surfaced via displayErrorMsg by the caller
      setStep('confirm');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Return Vehicle</Text>
        <Text style={styles.headerSubtitle}>Complete your rental</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {step === 'confirm' && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Confirm Return Details</Text>

              <View style={styles.detailsSection}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vehicle</Text>
                  <Text style={styles.detailValue}>{vehicleName ?? vehicleId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dock</Text>
                  <Text style={styles.detailValue}>{dockId}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{durationDisplay}</Text>
                </View>
                <View style={[styles.detailRow, styles.lastRow]}>
                  <Text style={styles.detailLabel}>Estimated Charge</Text>
                  <Text style={styles.chargeValue}>{feeDisplay}</Text>
                </View>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxText}>
                  The dock will be locked and your deposit will be refunded minus usage charges.
                </Text>
              </View>

              <Button mode="contained" onPress={handleConfirmReturn} style={styles.button}>
                Confirm Return
              </Button>
            </Card.Content>
          </Card>
        )}

        {step === 'processing' && (
          <Card style={styles.card}>
            <Card.Content style={styles.processingContent}>
              <ActivityIndicator size="large" color="#2196F3" style={styles.spinner} />
              <Text style={styles.processingTitle}>Processing Return</Text>
              <Text style={styles.processingStep}>Locking dock and finalizing payment...</Text>
            </Card.Content>
          </Card>
        )}

        {step === 'complete' && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.successHeader}>
                <View style={styles.successIconContainer}>
                  <Icon source="check-circle" size={48} color="#4CAF50" />
                </View>
                <Text style={styles.successTitle}>Return Complete!</Text>
                <Text style={styles.successSubtitle}>Thank you for riding with us</Text>
              </View>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{vehicleName ?? vehicleId}</Text>
                  <Text style={styles.summaryValue}>Returned to {dockId}</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Charged</Text>
                  <Text style={styles.totalValue}>{feeDisplay}</Text>
                </View>
              </View>

              <Button mode="contained" onPress={onComplete} style={styles.button}>
                Back to Available Vehicles
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E3F2FD',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 16,
    color: '#757575',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  chargeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderColor: '#64B5F6',
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    marginBottom: 24,
  },
  infoBoxText: {
    fontSize: 14,
    color: '#1976D2',
  },
  button: {
    marginTop: 8,
  },
  processingContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  processingTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  processingStep: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconContainer: {
    backgroundColor: '#E8F5E9',
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#757575',
  },
  summaryBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#757575',
  },
  summaryValue: {
    fontSize: 16,
    color: '#424242',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
});

export default ReturnFlow;
