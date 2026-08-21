import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Appbar, Button, Checkbox, Text } from 'react-native-paper';
import type { ModalProps } from 'react-native';
import NavBar from '../components/NavBar';
import { Alerts } from '../components/AlertArea';
import BikeDockEntryModal from './components/BikeDockEntryModal';
import CheckoutControlModal from './components/CheckoutControlModal';
import { EVENTS, subscribe, TokenOrUrlEventData, unsubscribe } from '../customEventHandler';
import { humanizeDurationHoursFull } from '../datetimeUtil';
import { displayErrorMsg, logDebug } from '../plugin/logger';
import {
  checkAndGetLibrarySetupStatus,
  checkinLibraryVehicle,
  checkoutLibraryVehicle,
  createLibrarySetupSession,
  getLibraryRentalHistory,
  getLibrarySetupStatus,
  getLibraryStations,
  LibraryRental,
  LibraryStation,
} from '../library/serverComm.ts';
import { addStatReading } from '../plugin/clientStats';
import useAppState from '../useAppState';

let barcodeScannerIsOpen = false;

function computeFee(rentalHours: number) {
  if (0 <= rentalHours && rentalHours <= 5) {
    return 5;
  } else if (5 < rentalHours && rentalHours <= 24) {
    return 35;
  } else if (24 < rentalHours && rentalHours <= 72) {
    return 100;
  } else if (72 < rentalHours && rentalHours <= 144) {
    return 200;
  } else if (144 < rentalHours && rentalHours <= 336) {
    return 380;
  } else {
    return 380;
  }
}

function formatRentalDuration(rentalHours: number | null) {
  if (rentalHours === null) {
    return '---';
  }

  return humanizeDurationHoursFull(rentalHours);
}

type RentalHistoryEntry = LibraryRental;

const LibraryTab = () => {
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupInProgress, setSetupInProgress] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [rentalStartTs, setRentalStartTs] = useState<number | null>(null);
  const [rentalBikeId, setRentalBikeId] = useState<string | null>(null);
  const [rentalNowTs, setRentalNowTs] = useState(Date.now());
  const [rentalHistory, setRentalHistory] = useState<RentalHistoryEntry[]>([]);
  const [stations, setStations] = useState<LibraryStation[] | null>(null);
  const [stationsLoading, setStationsLoading] = useState(false);
  const isMounted = useRef(true);
  const directStripeMode = true;
  const rentalHours = rentalStartTs
    ? Math.max(rentalNowTs - rentalStartTs, 0) / (60 * 60 * 1000)
    : null;
  const rentalStatusText = formatRentalDuration(rentalHours);
  const currentFee = rentalHours === null ? 0 : computeFee(rentalHours);

  const getRentalHistory = async (): Promise<RentalHistoryEntry[]> => {
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
  
  useAppState({
    // TODO: This is only called when we navigate to the tab, not when the app is launched.
    // Think about whether this is a problem and needs to be fixed.
    onActive: () => {
      void refreshSetupStatus();
      void refreshRentalHistory();
    },
  });

  useEffect(() => {
    return () => {
      /*
      Jack, do we use this in other components? Should we?
      isMounted is a guard to prevent state updates after the component has unmounted.
      Used with async calls; prevents trying to update React state after navigation away/unmount.
      */
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
            callbackPath = `${parsedUrl.hostname ? `/${parsedUrl.hostname}` : ''}${parsedUrl.pathname}`;
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
    if (rentalStartTs === null) {
      return;
    }

    if (!isSimulationMode) {
      setRentalNowTs(Date.now());
    }
    const intervalId = setInterval(() => {
      if (isMounted.current && !isSimulationMode) {
        setRentalNowTs(Date.now());
      }
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, [rentalStartTs, isSimulationMode]);

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

  const runQrScan = async (callback: (resultText: string) => void) => {
    if (barcodeScannerIsOpen) return;

    if (!(window as any)?.cordova?.plugins?.barcodeScanner) {
      Alerts.addMessage({ text: 'QR scanner is not available on this device.' });
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
          Alerts.addMessage({ text: 'No QR code found in scan. Please try again.' });
          return;
        }
        callback(result.text);
      },
      (error: { message?: string }) => {
        barcodeScannerIsOpen = false;
        Alerts.addMessage({ text: 'Scanning failed: ' + (error.message || 'Unknown error') });
        callback(error.message || 'Unknown error');
      },
    );
  };

  const scanCode = async (callback: (resultText: string) => void) => {
    Alerts.showPopup((props: Omit<ModalProps, 'children'>) => (
      <BikeDockEntryModal
        {...props}
        onScan={() => {
          void runQrScan(callback);
        }}
        onManualSubmit={(manualId: string) => {
          callback(manualId);
        }}
      />
    ));
  };

  const confirmCheckout = async (holdAmount: number, wantAccessories: boolean) => {
    setPaymentInProgress(true);
    addStatReading('checkout_initiated', { holdAmount, wantAccessories });
    scanCode((bike_id: string) => {
      void (async () => {
        try {
          await checkoutLibraryVehicle(bike_id, holdAmount);
          addStatReading('checkout_confirmed', { holdAmount, wantAccessories });
          Alerts.addMessage({ text: 'Checkout completed successfully.' });
          setRentalBikeId(bike_id);
          const now = Date.now();
          setRentalStartTs(now);
          setRentalNowTs(now);
        } catch (e) {
          addStatReading('checkout_aborted', { holdAmount, wantAccessories, error: String(e) });
          displayErrorMsg(String(e), 'Stripe checkout failed');
        } finally {
          setPaymentInProgress(false);
        }
      })();
    });
  };

  const checkout = () => {
    Alerts.showPopup((props: Omit<ModalProps, 'children'>) => (
      <CheckoutControlModal
        {...props}
        onConfirm={(wantAccessories: boolean, holdAmount: number) => {
          void confirmCheckout(holdAmount, wantAccessories);
        }}
      />
    ));
  };

  const loadStations = async () => {
    setStationsLoading(true);
    try {
      const response = await getLibraryStations();
      setStations(response.stations);
    } catch (e) {
      displayErrorMsg(String(e), 'Failed to load stations');
    } finally {
      setStationsLoading(false);
    }
  };

  const returnBike = async () => {
    if (rentalHours === null) {
      displayErrorMsg('No active rental to return.');
      return;
    }

    setPaymentInProgress(true);
    scanCode((dock_id: string) => {
      void (async () => {
        try {
          await checkinLibraryVehicle(dock_id);
          if (isMounted.current) {
            setRentalStartTs(null);
            setRentalBikeId(null);
          }
        } catch (e) {
          displayErrorMsg(String(e), 'Stripe return failed');
        } finally {
          setPaymentInProgress(false);
        }
      })();
    });
  };

  return (
    <>
      <NavBar elevated={true}>
        <Appbar.Content title="library" />
        <Appbar.Action
          icon="refresh"
          size={32}
          onPress={() => {
            void refreshSetupStatus();
            void refreshRentalHistory();
          }}
          style={{ margin: 0, marginLeft: 'auto' }}
        />
      </NavBar>

      <ScrollView style={styles.container} contentContainerStyle={styles.containerContent}>
        {directStripeMode && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningTitle}>DEV MODE: Connecting to sandbox</Text>
            <Text style={styles.warningBody}>
              This screen is connected to a sandbox for testing direct calls from the app.
            </Text>
            <Checkbox.Item
              label="Simulation mode"
              status={isSimulationMode ? 'checked' : 'unchecked'}
              onPress={() => setIsSimulationMode((prev) => !prev)}
            />
            <View style={styles.simulationButtonsRow}>
              <Button
                mode="outlined"
                style={styles.simulationButton}
                disabled={!isSimulationMode || !rentalBikeId}
                onPress={() => {
                  setRentalNowTs((prevTs) => prevTs + 60 * 60 * 1000);
                }}>
                +1 hour
              </Button>
              <Button
                mode="outlined"
                style={styles.simulationButton}
                disabled={!isSimulationMode || !rentalBikeId}
                onPress={() => {
                  setRentalNowTs((prevTs) => prevTs + 24 * 60 * 60 * 1000);
                }}>
                +1 day
              </Button>
            </View>
          </View>
        )}
        <View style={styles.rentalDurationRow}>
          <Text style={styles.statusLabel}>Current rental</Text>
          <Text style={styles.statusValue}>{rentalStatusText}</Text>
        </View>
        <View style={styles.statusRow}>
          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>Current fee</Text>
            <Text style={styles.statusValue}>${currentFee.toFixed(2)}</Text>
          </View>
        </View>
        <Button
          mode="contained"
          disabled={setupComplete || setupInProgress || paymentInProgress}
          onPress={onSetupCheckoutPress}>
          setup checkout
        </Button>
        <Button
          mode="contained"
          disabled={!setupComplete || setupInProgress || paymentInProgress || rentalStartTs !== null}
          onPress={checkout}>
          checkout
        </Button>
        <Button
          mode="contained"
          disabled={!setupComplete || setupInProgress || paymentInProgress || rentalStartTs === null}
          onPress={returnBike}>
          return
        </Button>
        <Button mode="outlined" loading={stationsLoading} onPress={loadStations}>
          show stations
        </Button>
        {stations !== null && (
          <View style={styles.stationList}>
            {stations.length === 0 ? (
              <Text>No stations found.</Text>
            ) : (
              stations.map((s, i) => (
                <View key={s['station_id'] ?? i} style={styles.stationItem}>
                  <Text style={styles.stationName}>{s['name'] ?? s['station_id'] ?? `Station ${i + 1}`}</Text>
                  <Text style={styles.stationDetail}>{JSON.stringify(s)}</Text>
                </View>
              ))
            )}
          </View>
        )}
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
                  {new Date(r.start_ts * 1000).toLocaleString()} →{' '}
                  {r.end_ts ? new Date(r.end_ts * 1000).toLocaleString() : 'ongoing'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerContent: {
    padding: 16,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c7c7c7',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f7f7f7',
    gap: 4,
  },
  statusLabel: {
    color: '#555555',
  },
  statusValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  rentalDurationRow: {
    borderWidth: 1,
    borderColor: '#c7c7c7',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f7f7f7',
    gap: 4,
  },
  simulationButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simulationButton: {
    flex: 1,
  },
  warningBanner: {
    borderWidth: 2,
    borderColor: '#b00020',
    backgroundColor: '#ffe8ec',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  warningTitle: {
    color: '#b00020',
    fontWeight: '700',
  },
  warningBody: {
    color: '#6b0012',
  },
  stationList: {
    borderWidth: 1,
    borderColor: '#c7c7c7',
    borderRadius: 8,
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
  },
});

export default LibraryTab;
