import React, { useContext, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Button, Card, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { LibraryRental } from '../serverComm';
import { AppContext } from '../../AppContext';
import { Alerts } from '../../components/AlertArea';
import AccessoryRequestModal from './AccessoryRequestModal';
import { storageGet, storageSet } from '../../plugin/storage';

const RENTAL_ACCESSORIES_STORAGE_KEY = 'library_rental_accessories';

interface RentalAccessoryStatus {
  vehicleId: string;
  requestedAccessories: string[];
  hasEmailed: boolean;
}

interface ActiveRentalProps {
  vehicleId: string;
  activeRental: LibraryRental;
  durationDisplay: string;
  feeDisplay: string;
  isInitializing?: boolean;
  onReturnVehicle: () => void;
  refreshing: boolean;
  onRefresh: () => void;
}

export function ActiveRental({
  vehicleId,
  activeRental,
  durationDisplay,
  feeDisplay,
  isInitializing,
  onReturnVehicle,
  refreshing,
  onRefresh,
}: ActiveRentalProps) {
  const { t, i18n } = useTranslation();
  const { appConfig, onboardingState } = useContext(AppContext);
  const [accessoryStatus, setAccessoryStatus] = useState<RentalAccessoryStatus | null>(null);

  const vehicleName =
    activeRental?.vehicle_name ?? t('library.active-rental.vehicle-fallback-name', { vehicleId });
  const lang = i18n.resolvedLanguage || 'en';
  const deploymentName = appConfig?.intro?.translated_text?.[lang]?.deployment_name;

  const loadAccessoryStatus = () => {
    void storageGet(RENTAL_ACCESSORIES_STORAGE_KEY)
      .then((storedStatus: RentalAccessoryStatus | null) => {
        setAccessoryStatus(storedStatus?.vehicleId === vehicleId ? storedStatus : null);
      })
      .catch(() => setAccessoryStatus(null));
  };

  useEffect(() => {
    loadAccessoryStatus();
  }, [vehicleId, refreshing]);

  const onOpenAccessoryModal = () => {
    if (!accessoryStatus) return;
    Alerts.showPopup(AccessoryRequestModal, {
      vehicleId,
      requestedAccessories: accessoryStatus.requestedAccessories,
      onEmailSent: () => {
        const emailedStatus = { ...accessoryStatus, hasEmailed: true };
        setAccessoryStatus(emailedStatus);
        void storageSet(RENTAL_ACCESSORIES_STORAGE_KEY, emailedStatus);
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isInitializing
              ? t('library.active-rental.initializing-title')
              : t('library.active-rental.title')}
          </Text>
          <Text style={styles.headerSubtitle}>{deploymentName}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Card>
          <Card.Content>
            <View style={styles.vehicleHeader}>
              <View style={styles.iconContainer}>
                {/* TODO get vehicle icon from base mode
                How should we get base mode? include it in rental obj,
                or lookup vehicles at some point? */}
                <Icon source="bike" size={32} color="#4CAF50" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleTitle}>{vehicleName}</Text>
                <Text style={styles.vehicleSubtitle}>
                  {t('library.active-rental.checked-out-since', {
                    time: new Date(activeRental.start_ts * 1000).toLocaleString('en-US', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Icon source="clock-outline" size={20} color="#757575" />
                <Text style={styles.infoText}>{durationDisplay}</Text>
              </View>
              {!isInitializing && (
                <View style={styles.infoRow}>
                  <Icon source="currency-usd" size={20} color="#757575" />
                  <Text style={styles.infoText}>
                    {t('library.active-rental.current-fee', { fee: feeDisplay })}
                  </Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {accessoryStatus &&
          accessoryStatus.requestedAccessories?.length > 0 &&
          !accessoryStatus.hasEmailed && (
            <Card>
              <Card.Content>
                <View style={styles.accessorySectionHeader}>
                  <View style={[styles.accessoryIconContainer]}>
                    <Icon source={'bag-personal-outline'} size={24} color={'#2196F3'} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.instructionsTitle}>
                      {t('library.active-rental.accessories-requested-title')}
                    </Text>
                    <Text style={styles.accessoryText}>
                      {t('library.active-rental.accessories-requested-subtitle', {
                        accessories: accessoryStatus.requestedAccessories.join(', '),
                      })}
                    </Text>
                  </View>
                </View>
                <Button
                  mode="contained"
                  icon="email-outline"
                  onPress={onOpenAccessoryModal}
                  style={styles.accessoryButton}>
                  {t('library.active-rental.email-librarian-accessories-button')}
                </Button>
              </Card.Content>
            </Card>
          )}

        <Card>
          <Card.Content>
            <Text style={styles.instructionsTitle}>
              {t('library.active-rental.return-instructions')}
            </Text>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {t('library.active-rental.step-find-dock-title')}
                </Text>
                <Text style={styles.stepText}>
                  {t('library.active-rental.step-find-dock-text')}
                </Text>
              </View>
            </View>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('library.active-rental.step-secure-title')}</Text>
                <Text style={styles.stepText}>{t('library.active-rental.step-secure-text')}</Text>
              </View>
            </View>

            <View style={styles.instructionStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{t('library.active-rental.step-scan-title')}</Text>
                <Text style={styles.stepText}>{t('library.active-rental.step-scan-text')}</Text>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={onReturnVehicle}
              icon="qrcode-scan"
              style={styles.returnButton}>
              {t('library.active-rental.scan-dock-to-return')}
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
    gap: 16,
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
  accessorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  accessoryIconContainer: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
  },
  accessoryText: {
    fontSize: 14,
    color: '#616161',
    marginTop: 2,
  },
  accessoryButton: {
    marginTop: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  contactSubtitle: {
    fontSize: 13,
    color: '#757575',
  },
});

export default ActiveRental;
