import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Banner, Button, Card, Checkbox, Icon, SegmentedButtons } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { VehicleLibraryAccessory } from 'op-deployment-configs';

export type LocalizedFeeText = Record<string, string>;

export interface FeeDescriptionConfig {
  rates?: {
    label: LocalizedFeeText;
    duration_hours: [number, number];
  }[];
  subgroup_notes?: Record<string, LocalizedFeeText>;
}

interface CheckoutFlowProps {
  vehicleId: string;
  paymentProcessing: boolean;
  holdAmountCents: number;
  accessories?: VehicleLibraryAccessory[];
  feeDescription?: FeeDescriptionConfig;
  subgroup?: string;
  feeForDuration: (durationHours: number) => number;
  onConfirm: (holdAmountCents: number, requestedAccessories: string[]) => void;
  onCancel: () => void;
}

export function CheckoutFlow({
  vehicleId,
  paymentProcessing,
  holdAmountCents,
  accessories = [],
  feeDescription,
  subgroup,
  feeForDuration,
  onConfirm,
  onCancel,
}: CheckoutFlowProps) {
  const { t, i18n } = useTranslation();
  const [plansLongTerm, setPlansLongTerm] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([]);
  const language = i18n.resolvedLanguage || 'en';
  const languageCode = language.split('-')[0];
  const localize = (text: LocalizedFeeText | undefined) =>
    text?.[language] ?? text?.[languageCode] ?? text?.en ?? Object.values(text ?? {})[0] ?? '';
  const subgroupNote = subgroup ? localize(feeDescription?.subgroup_notes?.[subgroup]) : undefined;
  const accessoryLabel = (accessory: VehicleLibraryAccessory) =>
    accessory.label[language] ||
    accessory.label.en ||
    Object.values(accessory.label)[0] ||
    accessory.value;
  const requestedAccessories = plansLongTerm
    ? accessories
        .filter((accessory) => selectedAccessories.includes(accessory.value))
        .map(accessoryLabel)
    : [];
  const paymentRequired = holdAmountCents > 0;
  const holdDisplay = (holdAmountCents / 100).toFixed(2);
  const calculateFeeForRange = ([baselineDuration, evaluationDuration]: [number, number]) =>
    Number((feeForDuration(evaluationDuration) - feeForDuration(baselineDuration)).toFixed(2));

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

            {feeDescription && (
              <View style={styles.accessoriesBox}>
                <Text style={styles.accessoriesTitle}>{t('library.checkout.rental-rates')}</Text>
                {feeDescription.rates?.map((rate) => {
                  const intervalHours = rate.duration_hours[1] - rate.duration_hours[0];
                  const isDailyRate = intervalHours >= 24;
                  const unitHours = isDailyRate ? 24 : 1;
                  const amount = Number(
                    (
                      calculateFeeForRange(rate.duration_hours) /
                      (intervalHours / unitHours)
                    ).toFixed(2),
                  );
                  return (
                    <View key={rate.duration_hours.join(':')} style={styles.pricingRow}>
                      <Text style={styles.pricingLabel}>{localize(rate.label)}</Text>
                      <Text style={styles.pricingAmount}>
                        ${amount}
                        {t(`library.checkout.per-${isDailyRate ? 'day' : 'hour'}`)}
                      </Text>
                    </View>
                  );
                })}
                <Text style={styles.pricingNote}>{t('library.checkout.proration-note')}</Text>
                {subgroupNote && <Text style={styles.pricingNote}>{subgroupNote}</Text>}
              </View>
            )}

            {accessories.length > 0 && (
              <View style={styles.accessoriesBox}>
                <Text style={styles.accessoriesTitle}>
                  {t('library.checkout.do-you-plan-long-rental')}
                </Text>
                <SegmentedButtons
                  value={plansLongTerm ? 'long-term' : 'short-term'}
                  onValueChange={(value) => {
                    setPlansLongTerm(value === 'long-term');
                    if (value === 'short-term') setSelectedAccessories([]);
                  }}
                  buttons={[
                    { value: 'long-term', label: t('general.yes') },
                    { value: 'short-term', label: t('general.no') },
                  ]}
                />

                {plansLongTerm && (
                  <View style={styles.accessoriesSubList}>
                    <Text style={styles.accessoriesTitle}>
                      {t('library.checkout.request-accessories')}
                    </Text>
                    {accessories.map((accessory) => {
                      const selected = selectedAccessories.includes(accessory.value);
                      const toggleAccessory = () =>
                        setSelectedAccessories((current) =>
                          selected
                            ? current.filter((value) => value !== accessory.value)
                            : [...current, accessory.value],
                        );
                      return (
                        <Pressable
                          key={accessory.value}
                          style={styles.accessoryRow}
                          onPress={toggleAccessory}>
                          <Checkbox
                            status={selected ? 'checked' : 'unchecked'}
                            onPress={toggleAccessory}
                          />
                          <Text style={styles.checkboxLabel}>{accessoryLabel(accessory)}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {paymentRequired && (
              <Banner visible icon="cash-refund" style={styles.warningBanner}>
                {t('library.checkout.hold-notice', { amount: holdDisplay })}
              </Banner>
            )}

            <Button
              mode="contained"
              onPress={() => onConfirm(holdAmountCents, requestedAccessories)}
              loading={paymentProcessing}
              disabled={paymentProcessing}
              style={styles.button}>
              {paymentRequired
                ? t('library.checkout.confirm-and-hold', { amount: holdDisplay })
                : t('library.checkout.confirm')}
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
    flex: 1,
    marginRight: 12,
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
    gap: 8,
  },
  accessoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  accessoriesSubList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
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
