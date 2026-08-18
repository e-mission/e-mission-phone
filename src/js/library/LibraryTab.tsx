import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
  finalizeStripeCheckoutSession,
  getLibrarySetupStatus,
  PaymentIntent,
  PaymentIntentStatus,
  captureStripeHoldPaymentIntent,
  createStripeCheckoutSession,
  createStripeHoldPaymentIntent,
  createStripePaymentIntent,
  createStripeRefund,
  isDirectStripeModeEnabled,
  retrieveStripePaymentIntent,
} from '../services/stripeCheckout';
import { addStatReading } from '../plugin/clientStats';
import useAppState from '../useAppState';

const SESSION_POLL_INTERVAL_MS = 3000;
const PAYMENT_INTENT_POLL_TIMEOUT_MS = 2 * 60 * 1000;

let barcodeScannerIsOpen = false;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollForPaymentIntentStatus(
  paymentIntentId: string,
): Promise<PaymentIntentStatus | undefined> {
  const startTs = Date.now();
  let lastStatus: PaymentIntentStatus | undefined;

  while (Date.now() - startTs < PAYMENT_INTENT_POLL_TIMEOUT_MS) {
    const paymentIntent = await retrieveStripePaymentIntent(paymentIntentId);
    lastStatus = paymentIntent.status;

    if (lastStatus === 'succeeded' || lastStatus === 'canceled') {
      return lastStatus;
    }

    await wait(SESSION_POLL_INTERVAL_MS);
  }

  return lastStatus;
}

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

const LibraryTab = () => {
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupInProgress, setSetupInProgress] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [rentalStartTs, setRentalStartTs] = useState<number | null>(null);
  const [rentalBikeId, setRentalBikeId] = useState<string | null>(null);
  const [rentalNowTs, setRentalNowTs] = useState(Date.now());
  const isMounted = useRef(true);
  const directStripeMode = isDirectStripeModeEnabled();
  const rentalHours = rentalStartTs
    ? Math.max(rentalNowTs - rentalStartTs, 0) / (60 * 60 * 1000)
    : null;
  const rentalStatusText = formatRentalDuration(rentalHours);
  const currentFee = rentalHours === null ? 0 : computeFee(rentalHours);

  const refreshSetupStatus = async () => {
    console.log('refreshSetupStatus: called');
    if (!isMounted.current) {
      console.log('refreshSetupStatus: component is not mounted, aborting');
      return;
    }

    try {
      console.log('refreshSetupStatus: fetching library setup status');
      const session = await getLibrarySetupStatus();
      console.log(`refreshSetupStatus: session = ` + session);
      if (isMounted.current) {
        setSetupComplete(session.status === 'completed');
      }
    } catch (e) {
      if (isMounted.current) {
        displayErrorMsg(String(e), 'Unable to refresh Stripe setup status');
      }
    }
  };

  useAppState({
    onActive: () => {
      if (setupInProgress) {
        void refreshSetupStatus();
      }
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
            const callback = await finalizeStripeCheckoutSession(callbackPath);
            console.log(`handleTokenOrUrl: callback = ` + callback);
            if (!isMounted.current) {
              return true;
            }

            if (callback.callback_status === 'success') {
              setSetupComplete(true);
            } else {
              setSetupComplete(false);
              Alerts.addMessage({
                text: `Stripe setup ${callback.callback_status || 'did not complete'}.`,
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
      const session = await createStripeCheckoutSession('setup');

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

  const mapBikeToDock = (bike_id: string) => {
    // Should we validate the bike_id before we try to map it?
    if (bike_id.startsWith('emission://')) {
      return "the_one_dock";
    }
    return null;
  };

  const mapDockToBike = (dock_id: string, bike_id: string) => {
    // Should we validate the dock_id before we try to map it?
    if (dock_id.startsWith('emission://')) {
      console.log(`Mapping ${dock_id} to ${bike_id}`);
    }
  };

  const unlockDock = (dock_id: string) => {
    // TODO: add validation to the bike_id here
    Alerts.addMessage({ text: `Unlocking dock ${dock_id}!` });
  };

  const lockDock = (dock_id: string) => {
    Alerts.addMessage({ text: `Locking dock ${dock_id}!` });
  };

  const confirmCheckout = async (holdAmount: number, wantAccessories: boolean) => {
    const holdDisplay = (holdAmount / 100).toFixed(2);

    try {
      setPaymentInProgress(true);
      addStatReading('checkout_initiated', { holdAmount, wantAccessories });
      // We need to figure out the order of operations; place hold first and then allow them to scan
      // or scan first and then place the hold
      const holdIntent = await createStripeHoldPaymentIntent(holdAmount);
      if (holdIntent.status !== 'requires_capture') {
        displayErrorMsg(
          `Hold status is '${holdIntent.status || 'unknown'}'.`,
          'Stripe hold not authorized',
        );
        addStatReading('checkout_aborted', { holdAmount, wantAccessories });
        return;
      }

      addStatReading('checkout_confirmed', { holdAmount, wantAccessories });
      Alerts.addMessage({ text: `Hold of $${holdDisplay} placed successfully.` });
      scanCode((bike_id: string) => {
        const dock_id = mapBikeToDock(bike_id);
        if (dock_id == null) {
          // TODO: Do we want to distinguish between the two error cases?
          displayErrorMsg(`Invalid bike_id '${bike_id}' or no dock found for dock_id`);
          return;
        }
        unlockDock(dock_id);
        setRentalBikeId(bike_id);
        const now = Date.now();
        setRentalStartTs(now);
        setRentalNowTs(now);
      });
    } catch (e) {
      addStatReading('checkout_aborted', { holdAmount, wantAccessories, error: String(e) });
      displayErrorMsg(String(e), 'Stripe checkout failed');
    } finally {
      if (isMounted.current) {
        setPaymentInProgress(false);
      }
    }
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

  const returnBike = async () => {
    if (rentalHours === null) {
      displayErrorMsg('No active rental to return.');
      return;
    }

    try {
      setPaymentInProgress(true);
      scanCode((dock_id: string) => {
        if (!rentalBikeId) {
          displayErrorMsg('No active bike ID found for this rental.');
          return;
        }
        lockDock(dock_id);
        mapDockToBike(dock_id, rentalBikeId);
      });
      const capturedIntent: PaymentIntent = await captureStripeHoldPaymentIntent(currentFee * 100);
      const status = capturedIntent.status || (await pollForPaymentIntentStatus(capturedIntent.id));
      if (status !== 'succeeded') {
        displayErrorMsg(
          `Capture status is '${status || 'unknown'}'.`,
          'Stripe return not complete',
        );
        return;
      }

      if (isMounted.current) {
        setRentalStartTs(null);
        setRentalBikeId(null);
      }
    } catch (e) {
      displayErrorMsg(String(e), 'Stripe return failed');
    } finally {
      if (isMounted.current) {
        setPaymentInProgress(false);
      }
    }
  };

  return (
    <>
      <NavBar elevated={true}>
        <Appbar.Content title="library" />
      </NavBar>

      <View style={styles.container}>
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
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});

export default LibraryTab;