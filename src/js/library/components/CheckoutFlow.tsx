import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Banner, Button, Card, Checkbox, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';

const HOLD_AMOUNT_CENTS = 38000;

// example durations shown as a rate preview: 3 hours, 1 day, 3 days, 1 week
const EXAMPLE_DURATIONS_HOURS = [3, 24, 72, 168];

function formatExampleDuration(hours: number): string {
  if (hours < 24) return i18next.t('library.checkout.duration-hours', { n: hours });
  const days = hours / 24;
  return days === 1
    ? i18next.t('library.checkout.duration-one-day')
    : i18next.t('library.checkout.duration-days', { n: days });
}

interface CheckoutFlowProps {
  vehicleId: string;
  paymentProcessing: boolean;
  estimateFee: (durationHours: number) => number;
  onConfirm: (wantAccessories: boolean, holdAmountCents: number) => void;
  onCancel: () => void;
}

export function CheckoutFlow({
  vehicleId,
  paymentProcessing,
  estimateFee,
  onConfirm,
  onCancel,
}: CheckoutFlowProps) {
  const { t } = useTranslation();
  const [wantsPanniers, setWantsPanniers] = useState(false);
  const [wantsFrontBasket, setWantsFrontBasket] = useState(false);
  const wantsAccessories = wantsPanniers || wantsFrontBasket;
  const holdDisplay = (HOLD_AMOUNT_CENTS / 100).toFixed(2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          icon="arrow-left"
          onPress={onCancel}
          textColor="#FFFFFF"
          style={{ marginRight: 'auto' }}>
          {t('library.checkout.back')}
        </Button>
        <Text style={styles.headerTitle}>{t('library.checkout.title', { vehicleId })}</Text>
        <Text style={styles.headerSubtitle}>{t('library.checkout.subtitle')}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Icon source="clock-outline" size={24} color="#2196F3" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>{t('library.checkout.rental-title')}</Text>
                <Text style={styles.cardSubtitle}>{t('library.checkout.rental-subtitle')}</Text>
              </View>
            </View>

            <View style={styles.accessoriesBox}>
              <Text style={styles.accessoriesTitle}>{t('library.checkout.example-rates')}</Text>
              {EXAMPLE_DURATIONS_HOURS.map((hours) => (
                <View key={hours} style={styles.pricingRow}>
                  <Text style={styles.checkboxLabel}>{formatExampleDuration(hours)}</Text>
                  <Text style={styles.pricingAmount}>${estimateFee(hours).toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.accessoriesBox}>
              <Text style={styles.accessoriesTitle}>
                {t('library.checkout.request-accessories')}
              </Text>
              <View style={styles.accessoryRow}>
                <Checkbox
                  status={wantsPanniers ? 'checked' : 'unchecked'}
                  onPress={() => setWantsPanniers(!wantsPanniers)}
                />
                <Text style={styles.checkboxLabel}>{t('library.checkout.panniers')}</Text>
              </View>
              <View style={styles.accessoryRow}>
                <Checkbox
                  status={wantsFrontBasket ? 'checked' : 'unchecked'}
                  onPress={() => setWantsFrontBasket(!wantsFrontBasket)}
                />
                <Text style={styles.checkboxLabel}>{t('library.checkout.front-basket')}</Text>
              </View>
            </View>

            <Banner visible icon="cash-refund" style={styles.warningBanner}>
              {t('library.checkout.deposit-notice', { amount: holdDisplay })}
            </Banner>

            <Button
              mode="contained"
              onPress={() => onConfirm(wantsAccessories, HOLD_AMOUNT_CENTS)}
              loading={paymentProcessing}
              disabled={paymentProcessing}
              style={styles.button}>
              {t('library.checkout.open-stripe', { amount: holdDisplay })}
            </Button>

            <Button
              mode="outlined"
              onPress={onCancel}
              disabled={paymentProcessing}
              style={styles.button}>
              {t('library.checkout.cancel')}
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
    backgroundColor: '#2196F3',
    padding: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  pricingBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pricingLabel: {
    fontSize: 16,
    color: '#424242',
  },
  pricingAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  pricingNote: {
    fontSize: 14,
    color: '#757575',
  },
  accessoriesBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  accessoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  accessoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#424242',
    marginLeft: 8,
  },
  warningBanner: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
});

export default CheckoutFlow;
