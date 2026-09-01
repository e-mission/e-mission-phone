import React, { useContext, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Banner, Text } from 'react-native-paper';
import { conditional_surveys } from 'e-mission-common';
import { AppContext } from '../App';
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
  const activeRental = rentalHistory.findLast((r) => r.rental_status === 'active') ?? null;
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
        displayErrorMsg(String(e), 'Unable to refresh Stripe setup status');
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
        displayErrorMsg(String(e), 'Unable to refresh rental history');
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
        displayErrorMsg(String(e), 'Failed to load stations');
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
                text: `Stripe setup ${callback.payment_setup_status || 'did not complete'}.`,
              });
            }
            setIsSandbox(callback.is_sandbox);

            return true;
          } catch (e) {
            if (isMounted.current) {
              setSetupComplete(false);
              displayErrorMsg(String(e), 'Stripe setup finalization failed');
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
      displayErrorMsg(String(e), 'Stripe setup failed');
    }
  };

  // Routes a scanned/typed code to the checkout or return flow, depending on
  // which QR scanner screen is currently active.
  const handleScanResult = (code: string) => {
    // TODO is there a validation step needed here?
    setScreen((prev) => {
      if (prev.name === 'scan-checkout') return { name: 'checkout', vehicleId: code };
      if (prev.name === 'scan-return') return { name: 'return', dockId: code };
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
      Alerts.addMessage({ text: 'Checkout completed successfully.' });
      setRentalNowTs(Date.now());
      await refreshRentalHistory();
      if (isMounted.current) {
        setScreen({ name: 'browse' });
      }
    } catch (e) {
      addStatReading('checkout_aborted', { holdAmount, wantAccessories, error: String(e) });
      displayErrorMsg(String(e), 'Stripe checkout failed');
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
      displayErrorMsg(String(e), 'Stripe return failed');
      throw e;
    }
  };

  const openScanQrButton = () => {
    if (!setupComplete) {
      Alerts.addMessage({ text: 'Please complete payment setup before checking out a vehicle.' });
      return;
    }
    setScreen({ name: 'scan-checkout' });
  };

  const onSimulateDurationOffset = (hours: number) => {
    setIsSimulationMode(true);
    setRentalNowTs((prevTs) =>
      Math.max(activeRental?.start_ts ?? 0, prevTs + hours * 60 * 60 * 1000),
    );
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
      {screen.name === 'browse' && (
        <ScrollView style={styles.browseScroll} contentContainerStyle={styles.browseContent}>
          {isSandbox && (
            <LibraryDevPanel
              showTestLocations={showTestLocations}
              onToggleTestLocations={() => setShowTestLocations((prev) => !prev)}
              subgroups={appConfig?.opcode?.subgroups}
              simulatedSubgroup={simulatedSubgroup}
              onChangeSimulatedSubgroup={setSimulatedSubgroup}
              onSimulateDurationOffset={onSimulateDurationOffset}
            />
          )}
          {setupComplete == false && (
            <Banner
              visible
              icon="credit-card-outline"
              actions={[
                {
                  label: 'Set up payment',
                  onPress: () => void onSetupCheckoutPress(),
                  disabled: setupInProgress,
                },
              ]}>
              Set up your payment method to check out a vehicle.
            </Banner>
          )}
          <View style={styles.flowScreen}>
            {activeRental ? (
              <ActiveRental
                vehicleId={rentalVehicleId ?? ''}
                activeRental={activeRental}
                durationDisplay={rentalStatusText}
                feeDisplay={feeDisplay}
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
          <Text style={styles.sectionHeader}>Rental history</Text>
          <View style={styles.stationList}>
            {rentalHistory.length === 0 ? (
              <Text style={styles.stationDetail}>No rentals yet.</Text>
            ) : (
              rentalHistory.map((r, i) => (
                <View key={i} style={styles.stationItem}>
                  <Text style={styles.stationName}>
                    {r.vehicle_name ?? r.vehicle_id} — {r.rental_status}
                  </Text>
                  <Text style={styles.stationDetail}>
                    {r.start_fmt_time ?? new Date(r.start_ts * 1000).toLocaleString()}
                    {r.start_dock_id ? ` · ${r.start_dock_id}` : ''}
                    {' → '}
                    {r.end_fmt_time
                      ? `${r.end_fmt_time}${r.end_dock_id ? ` · ${r.end_dock_id}` : ''}`
                      : 'ongoing'}
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
