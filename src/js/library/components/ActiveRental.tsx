import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Button, Card, Icon } from 'react-native-paper';
import { LibraryRental } from '../serverComm';
import { DateTime } from 'luxon';

interface ActiveRentalProps {
  vehicleId: string;
  activeRental: LibraryRental;
  durationDisplay: string;
  feeDisplay: string;
  onReturnVehicle: () => void;
  refreshing: boolean;
  onRefresh: () => void;
}

export function ActiveRental({
  vehicleId,
  activeRental,
  durationDisplay,
  feeDisplay,
  onReturnVehicle,
  refreshing,
  onRefresh,
}: ActiveRentalProps) {
  console.debug({ activeRental });
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Active Rental</Text>
          <Text style={styles.headerSubtitle}>
            {activeRental?.vehicle_name ?? `Vehicle ${vehicleId}`}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.vehicleHeader}>
              <View style={styles.iconContainer}>
                {/* TODO get vehicle icon from base mode
                How should we get base mode? include it in rental obj,
                or lookup vehicles at some point? */}
                <Icon source="bike" size={32} color="#4CAF50" />
              </View>
              <View>
                <Text style={styles.vehicleTitle}>
                  {activeRental?.vehicle_name ?? `Vehicle ${vehicleId}`}
                </Text>
                <Text style={styles.vehicleSubtitle}>
                  Checked out since{' '}
                  {new Date(activeRental.start_ts * 1000).toLocaleString('en-US', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Icon source="clock-outline" size={20} color="#757575" />
                <Text style={styles.infoText}>{durationDisplay}</Text>
              </View>
              <View style={styles.infoRow}>
                <Icon source="currency-usd" size={20} color="#757575" />
                <Text style={styles.infoText}>Current fee: {feeDisplay}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.instructionsTitle}>Return Instructions</Text>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Find a dock station</Text>
                <Text style={styles.stepText}>Return the vehicle to any available dock</Text>
              </View>
            </View>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Secure the vehicle</Text>
                <Text style={styles.stepText}>Place the vehicle in the dock</Text>
              </View>
            </View>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Scan dock QR code</Text>
                <Text style={styles.stepText}>Lock the dock and complete your rental</Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={onReturnVehicle}
              icon="qrcode-scan"
              style={styles.returnButton}>
              Scan Dock to Return
            </Button>
          </Card.Content>
        </Card>
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
    backgroundColor: '#4CAF50',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E8F5E9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginRight: 16,
  },
  vehicleTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  vehicleSubtitle: {
    fontSize: 16,
    color: '#757575',
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#424242',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    backgroundColor: '#E3F2FD',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 14,
    color: '#757575',
  },
  returnButton: {
    marginTop: 8,
  },
});

export default ActiveRental;
