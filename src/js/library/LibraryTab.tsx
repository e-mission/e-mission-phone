import React, { useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Text } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { conditional_surveys } from 'e-mission-common';
import { AppContext } from '../AppContext';
import { Alerts } from '../components/AlertArea';
import AvailableVehicles from './components/AvailableVehicles';
import ActiveRental from './components/ActiveRental';
import CheckoutFlow from './components/CheckoutFlow';
import ReturnFlow from './components/ReturnFlow';
import QRScanner from './components/QRScanner';
import LibraryDevPanel from './components/LibraryDevPanel';
import { EVENTS, subscribe, TokenOrUrlEventData, unsubscribe } from '../customEventHandler';
import { humanizeDurationHoursFull } from '../datetimeUtil';
import { displayErrorMsg } from '../plugin/logger';
import {
  checkAndGetLibrarySetupStatus,
  checkinLibraryVehicle,
  checkoutLibraryVehicle,
  createLibrarySetupSession,
  getLibraryRentalHistory,
  getLibraryStations,
  LibraryRental,
  LibraryStation,
  LibraryVehicle,
} from './serverComm';
import { addStatReading } from '../plugin/clientStats';
import useAppState from '../useAppState';

function computeFee(
  feeExpression: string,
  duration: number,
  subgroup: string | undefined,
  vehicle?: LibraryVehicle,
): number {
  const scope = { duration, subgroup, ...vehicle };
  return conditional_surveys.scoped_eval(feeExpression, scope);
}

function formatRentalDuration(rentalHours: number | null) {
  if (rentalHours === null) {
    return '---';
  }

  return humanizeDurationHoursFull(rentalHours);
}

// Which screen of the vehicle-rental flow is currently shown. 'browse' shows
// either the station list or the active rental, depending on rental state.
type Screen =
  | { name: 'browse' }
  | { name: 'scan-checkout' }
  | { name: 'checkout'; vehicleId: string }
  | { name: 'scan-return' }
  | { name: 'return'; dockId: string };

const LibraryTab = () => {
  const { t } = useTranslation();
  const { appConfig, onboardingState } = useContext(AppContext);
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const [setupInProgress, setSetupInProgress] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [simulatedSubgroup, setSimulatedSubgroup] = useState<string | undefined>(undefined);
  const [showTestLocations, setShowTestLocations] = useState(false);
  const [rentalNowTs, setRentalNowTs] = useState(Date.now() / 1000);
  const [rentalHistory, setRentalHistory] = useState<LibraryRental[]>([]);
  const [stations, setStations] = useState<LibraryStation[] | null>(null);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [screen, setScreen] = useState<Screen>({ name: 'browse' });
  const isMounted = useRef(true);

  const subgroup = simulatedSubgroup ?? onboardingState?.subgroup;
  const activeRental =
    rentalHistory.findLast(
      (r) => r.rental_status === 'active' || r.rental_status === 'initializing',
    ) ?? null;
  const isInitializing = activeRental?.rental_status === 'initializing';
  const rentalVehicleId = activeRental?.vehicle_id ?? null;
  const rentalHours = activeRental
    ? Math.max(rentalNowTs - activeRental.start_ts, 0) / (60 * 60)
    : null;
  const rentalStatusText = formatRentalDuration(rentalHours);
  const feeExpression = appConfig?.vehicle_library?.fee_expression;
  const currentFee = rentalHours === null ? 0 : computeFee(feeExpression, rentalHours, subgroup);
  const feeDisplay = `$${currentFee.toFixed(2)}`;

  const getRentalHistory = async (): Promise<LibraryRental[]> => {
    const history = await getLibraryRentalHistory();
    return history.rental_history;
  };

  const refreshSetupStatus = async () => {
    console.log('refreshSetupStatus: called');
    if (!isMounted.current) {
      console.log('refreshSetupStatus: component is not mounted, aborting');
      return;
    }

    try {
      console.log('refreshSetupStatus: fetching library setup status');
      const callback_path = '/payment/setup/refresh';
      const session = await checkAndGetLibrarySetupStatus(callback_path);
      console.log(`refreshSetupStatus: response = ` + JSON.stringify(session));
      if (isMounted.current) {
        setIsSandbox(session.is_sandbox);
        setSetupComplete(session.payment_setup_status === 'SUCCEEDED');
      }
    } catch (e) {
      if (isMounted.current) {
        displayErrorMsg(String(e), t('library.errors.refresh-setup-status'));
      }
    }
  };
  const refreshRentalHistory = async () => {
    console.log('refreshRentalHistory: called');
    if (!isMounted.current) {
      console.log('refreshRentalHistory: component is not mounted, aborting');
      return;
    }

    try {
      console.log('refreshRentalHistory: fetching rental history');
      const history = await getRentalHistory();
      if (isMounted.current) {
        setRentalHistory(history);
      }
    } catch (e) {
      if (isMounted.current) {
        displayErrorMsg(String(e), t('library.errors.refresh-rental-history'));
      }
    }
  };

  const loadStations = async () => {
    setStationsLoading(true);
    try {
      const response = await getLibraryStations();
      if (isMounted.current) {
        setStations(response.stations);
      }
    } catch (e) {
      if (isMounted.current) {
        displayErrorMsg(String(e), t('library.errors.load-stations'));
      }
    } finally {
      if (isMounted.current) {
        setStationsLoading(false);
      }
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshSetupStatus(), refreshRentalHistory(), loadStations()]);
    } finally {
      if (isMounted.current) {
        setRefreshing(false);
      }
    }
  };

  useAppState({
    // TODO: This is only called when we navigate to the tab, not when the app is launched.
    // Think about whether this is a problem and needs to be fixed.
    onActive: () => {
      void refreshSetupStatus();
      void refreshRentalHistory();
    },
  });

  useEffect(() => {
    void loadStations();
    return () => {
      /*
      Jack, do we use this in other components? Should we?
      isMounted is a guard to prevent state updates after the component has unmounted.
      Used with async calls; prevents trying to update React state after navigation away/unmount.
      */
      // TODO
      isMounted.current = false;
    };
  }, []);

  // TODO: think through error cases and error reporting more carefully.
  useEffect(() => {
    const handleTokenOrUrlEvent = (event: Event) => {
      const { tokenOrUrl, registerHandler } = (event as CustomEvent<TokenOrUrlEventData>).detail;

      registerHandler(
        (async () => {
          let callbackPath: string;
          try {
            const parsedUrl = new URL(tokenOrUrl);
            callbackPath = `${parsedUrl.hostname ? `/${parsedUrl.hostname}` : ''}${
              parsedUrl.pathname
            }`;
          } catch {
            return false;
          }

          if (!callbackPath.startsWith('/payment')) {
            return false;
          }

          if (isMounted.current) {
            setSetupInProgress(true);
          }

          try {
            const callback = await checkAndGetLibrarySetupStatus(callbackPath);
            console.log(`handleTokenOrUrl: callback = ` + callback);
            if (!isMounted.current) {
              return true;
            }

            if (callback.payment_setup_status === 'SUCCEEDED') {
              setSetupComplete(true);
            } else {
              setSetupComplete(false);
              Alerts.addMessage({
                text: t('library.stripe-setup-status', {
                  status:
                    callback.payment_setup_status || t('library.stripe-setup-did-not-complete'),
                }),
              });
            }
            setIsSandbox(callback.is_sandbox);

            return true;
          } catch (e) {
            if (isMounted.current) {
              setSetupComplete(false);
              displayErrorMsg(String(e), t('library.errors.stripe-setup-finalization'));
            }
            return true;
          } finally {
            if (isMounted.current) {
              setSetupInProgress(false);
            }
          }
        })(),
      );
    };

    subscribe(EVENTS.TOKEN_OR_URL_EVENT, handleTokenOrUrlEvent);
    return () => unsubscribe(EVENTS.TOKEN_OR_URL_EVENT, handleTokenOrUrlEvent);
  }, []);

  useEffect(() => {
    if (!activeRental) {
      return;
    }

    if (!isSimulationMode) {
      setRentalNowTs(Date.now() / 1000);
    }
    const intervalId = setInterval(() => {
      if (isMounted.current && !isSimulationMode) {
        setRentalNowTs(Date.now() / 1000);
      }
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [activeRental, isSimulationMode]);

  const onSetupCheckoutPress = async () => {
    try {
      setSetupInProgress(true);
      const session = await createLibrarySetupSession();

      (window as any).cordova.InAppBrowser.open(session.url as string, '_system');
    } catch (e) {
      console.error('onSetupCheckoutPress: error = ' + e);
      if (isMounted.current) {
        setSetupInProgress(false);
      }
      displayErrorMsg(String(e), t('library.errors.stripe-setup'));
    }
  };

  // Routes a scanned/typed code to the checkout or return flow, depending on
  // which QR scanner screen is currently active.
  const handleScanResult = (scannedCode: string) => {
    // TODO is there a validation step needed here?
    const code = scannedCode.trim();
    setScreen((prev) => {
      if (prev.name === 'scan-checkout') return { name: 'checkout', vehicleId: code };
      if (prev.name === 'scan-return') {
        // dock QR codes are URLs like https://app.bikeep.com/222222; the server wants the bare code
        const dockId = code.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? code;
        return { name: 'return', dockId };
      }
      return prev;
    });
  };

  const confirmCheckout = async (
    vehicleId: string,
    holdAmount: number,
    wantAccessories: boolean,
  ) => {
    setPaymentInProgress(true);
    addStatReading('checkout_initiated', { holdAmount, wantAccessories });
    try {
      await checkoutLibraryVehicle(vehicleId, holdAmount);
      addStatReading('checkout_confirmed', { holdAmount, wantAccessories });
      Alerts.addMessage({ text: t('library.checkout-success') });
      setRentalNowTs(Date.now());
      await refreshRentalHistory();
      if (isMounted.current) {
        setScreen({ name: 'browse' });
      }
    } catch (e) {
      addStatReading('checkout_aborted', { holdAmount, wantAccessories, error: String(e) });
      displayErrorMsg(String(e), t('library.errors.checkout'));
    } finally {
      if (isMounted.current) {
        setPaymentInProgress(false);
      }
    }
  };

  const confirmReturn = async (dockId: string) => {
    if (rentalHours === null) {
      throw new Error('No active rental to return.');
    }

    try {
      await checkinLibraryVehicle(dockId);
      await refreshRentalHistory();
    } catch (e) {
      displayErrorMsg(String(e), t('library.errors.stripe-return'));
      throw e;
    }
  };

  const openScanQrButton = () => {
    if (!setupComplete) {
      Alerts.addMessage({ text: t('library.setup-required-before-checkout') });
      return;
    }
    setScreen({ name: 'scan-checkout' });
  };

  const onSimulateDurationOffset = (hours: number) => {
    setIsSimulationMode(true);
    setRentalNowTs((prevTs) => Math.max(activeRental?.start_ts ?? 0, prevTs + hours * 60 * 60));
  };

  if (setupComplete === null) {
    // full page loading indicator while setup status is being determined

    return (
      <View style={{ height: '100%', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isSandbox && (
        <LibraryDevPanel
          showTestLocations={showTestLocations}
          onToggleTestLocations={() => setShowTestLocations((prev) => !prev)}
          subgroups={appConfig?.opcode?.subgroups}
          simulatedSubgroup={simulatedSubgroup}
          onChangeSimulatedSubgroup={setSimulatedSubgroup}
          hasActiveRental={!!activeRental}
          onSimulateDurationOffset={onSimulateDurationOffset}
        />
      )}
      {screen.name === 'browse' && (
        <ScrollView style={styles.browseScroll} contentContainerStyle={styles.browseContent}>
          {setupComplete == false && (
            <Banner
              visible
              icon="credit-card-outline"
              actions={[
                {
                  label: t('library.set-up-payment'),
                  onPress: () => void onSetupCheckoutPress(),
                  disabled: setupInProgress,
                },
              ]}>
              {t('library.set-up-payment-banner')}
            </Banner>
          )}
          <View style={styles.flowScreen}>
            {activeRental ? (
              <ActiveRental
                vehicleId={rentalVehicleId ?? ''}
                activeRental={activeRental}
                durationDisplay={rentalStatusText}
                feeDisplay={feeDisplay}
                isInitializing={isInitializing}
                onReturnVehicle={() => setScreen({ name: 'scan-return' })}
                refreshing={refreshing}
                onRefresh={() => void refreshAll()}
              />
            ) : (
              <AvailableVehicles
                stations={stations}
                stationsLoading={stationsLoading}
                refreshing={refreshing}
                onRefresh={() => void refreshAll()}
                onScanQrButton={openScanQrButton}
                includeTestLocations={showTestLocations}
              />
            )}
          </View>
          <Text style={styles.sectionHeader}>{t('library.rental-history')}</Text>
          <View style={styles.stationList}>
            {rentalHistory.length === 0 ? (
              <Text style={styles.stationDetail}>{t('library.no-rentals-yet')}</Text>
            ) : (
              rentalHistory.map((r, i) => (
                <View key={i} style={styles.stationItem}>
                  <Text style={styles.stationName}>
                    {t('library.rental-summary', {
                      vehicle: r.vehicle_name ?? r.vehicle_id,
                      status: r.rental_status,
                    })}
                  </Text>
                  <Text style={styles.stationDetail}>
                    {r.start_fmt_time ?? new Date(r.start_ts * 1000).toLocaleString()}
                    {r.start_dock_id ? ` · ${r.start_dock_id}` : ''}
                    {' → '}
                    {r.end_fmt_time
                      ? `${r.end_fmt_time}${r.end_dock_id ? ` · ${r.end_dock_id}` : ''}`
                      : t('library.rental-ongoing')}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {(screen.name === 'checkout' || screen.name === 'return') && (
        <View style={styles.flowScreen}>
          {screen.name === 'checkout' && (
            <CheckoutFlow
              vehicleId={screen.vehicleId}
              paymentProcessing={paymentInProgress}
              estimateFee={(hours) => computeFee(feeExpression, hours, subgroup)}
              onConfirm={(wantAccessories, holdAmount) =>
                void confirmCheckout(screen.vehicleId, holdAmount, wantAccessories)
              }
              onCancel={() => setScreen({ name: 'browse' })}
            />
          )}
          {screen.name === 'return' && (
            <ReturnFlow
              vehicleId={rentalVehicleId ?? ''}
              dockId={screen.dockId}
              vehicleName={activeRental?.vehicle_name}
              durationDisplay={rentalStatusText}
              feeDisplay={feeDisplay}
              isInitializing={isInitializing}
              onConfirmReturn={() => confirmReturn(screen.dockId)}
              onComplete={() => setScreen({ name: 'browse' })}
            />
          )}
        </View>
      )}

      {(screen.name === 'scan-checkout' || screen.name === 'scan-return') && (
        <QRScanner
          mode={screen.name === 'scan-checkout' ? 'checkout' : 'return'}
          onScan={handleScanResult}
          onClose={() => setScreen({ name: 'browse' })}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flowScreen: {
    flex: 1,
  },
  browseScroll: {
    flex: 1,
  },
  browseContent: {
    paddingBottom: 16,
    // gap: 12,
  },
  stationList: {
    borderWidth: 1,
    borderColor: '#c7c7c7',
    borderRadius: 8,
    marginHorizontal: 16,
  },
  stationItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  stationName: {
    fontWeight: '600',
  },
  stationDetail: {
    color: '#555555',
    fontSize: 12,
  },
  sectionHeader: {
    fontWeight: '700',
    fontSize: 15,
    marginHorizontal: 16,
  },
});

export default LibraryTab;
