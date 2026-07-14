import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Appbar, Button, Text } from 'react-native-paper';
import NavBar from '../components/NavBar';
import { displayErrorMsg } from '../plugin/logger';
import {
  PaymentIntent,
  CheckoutSession,
  CheckoutSessionStatus,
  PaymentIntentStatus,
  captureStripeHoldPaymentIntent,
  createStripeCheckoutSession,
  createStripeHoldPaymentIntent,
  createStripePaymentIntent,
  createStripeRefund,
  isDirectStripeModeEnabled,
  listStripeCheckoutSessions,
  retrieveStripePaymentIntent,
} from '../services/stripeCheckout';

const SESSION_POLL_INTERVAL_MS = 3000;
const PAYMENT_INTENT_POLL_TIMEOUT_MS = 2 * 60 * 1000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollForCheckoutSessionStatus(
  sessionId: string,
  expiresAt?: number,
): Promise<CheckoutSessionStatus> {
  while (true) {
    const sessions = await listStripeCheckoutSessions({ limit: 25 });
    const session = sessions.find((s: CheckoutSession) => s.id === sessionId);

    if (session?.status === 'complete' || session?.status === 'expired') {
      return session.status;
    }

    if (expiresAt && Date.now() / 1000 >= expiresAt) {
      return 'expired';
    }

    await wait(SESSION_POLL_INTERVAL_MS);
  }
}

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

const LibraryTab = () => {
  const [setupComplete, setSetupComplete] = useState(false);
  const [setupInProgress, setSetupInProgress] = useState(false);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const isMounted = useRef(true);
  const directStripeMode = isDirectStripeModeEnabled();

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const onSetupCheckoutPress = async () => {
    try {
      setSetupInProgress(true);
      const session = await createStripeCheckoutSession('setup');

      (window as any).cordova.InAppBrowser.open(session.url as string, '_system');

      const status = await pollForCheckoutSessionStatus(session.id, session.expires_at);
      if (status === 'complete' && isMounted.current) {
        setSetupComplete(true);
      }
    } catch (e) {
      displayErrorMsg(String(e), 'Stripe setup failed');
    } finally {
      if (isMounted.current) {
        setSetupInProgress(false);
      }
    }
  };

  const onCheckoutPress = async (amount: number) => {
    try {
      setPaymentInProgress(true);
      const paymentIntent = await createStripePaymentIntent(amount);
      const status = await pollForPaymentIntentStatus(paymentIntent.id);
      if (status !== 'succeeded') {
        displayErrorMsg(
          `PaymentIntent status is '${status || 'unknown'}'.`,
          'Stripe checkout not complete',
        );
      }
    } catch (e) {
      displayErrorMsg(String(e), 'Stripe checkout failed');
    } finally {
      if (isMounted.current) {
        setPaymentInProgress(false);
      }
    }
  };

  const onReturnPress = async () => {
    try {
      setPaymentInProgress(true);
      const refund = await createStripeRefund(15000);
      if (refund.status && !['succeeded', 'pending'].includes(refund.status)) {
        displayErrorMsg(
          `Refund status is '${refund.status || 'unknown'}'.`,
          'Stripe return not complete',
        );
      }
    } catch (e) {
      displayErrorMsg(String(e), 'Stripe return failed');
    } finally {
      if (isMounted.current) {
        setPaymentInProgress(false);
      }
    }
  };

  const onPlaceHoldPress = async () => {
    try {
      setPaymentInProgress(true);
      const holdIntent = await createStripeHoldPaymentIntent(20000);
      if (holdIntent.status !== 'requires_capture') {
        displayErrorMsg(
          `Hold status is '${holdIntent.status || 'unknown'}'.`,
          'Stripe hold not authorized',
        );
      }
    } catch (e) {
      displayErrorMsg(String(e), 'Stripe hold failed');
    } finally {
      if (isMounted.current) {
        setPaymentInProgress(false);
      }
    }
  };

  const onCaptureHoldPress = async () => {
    try {
      setPaymentInProgress(true);
      const capturedIntent: PaymentIntent = await captureStripeHoldPaymentIntent(5000);
      const status = capturedIntent.status || (await pollForPaymentIntentStatus(capturedIntent.id));
      if (status !== 'succeeded') {
        displayErrorMsg(
          `Capture status is '${status || 'unknown'}'.`,
          'Stripe capture not complete',
        );
      }
    } catch (e) {
      displayErrorMsg(String(e), 'Stripe capture failed');
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
          </View>
        )}
        <Button
          mode="contained"
          disabled={setupComplete || setupInProgress || paymentInProgress}
          onPress={onSetupCheckoutPress}>
          setup checkout
        </Button>
        <Button
          mode="contained"
          disabled={!setupComplete || setupInProgress || paymentInProgress}
          onPress={() => onCheckoutPress(20000)}>
          checkout ($200.00)
        </Button>
        <Button
          mode="contained"
          disabled={!setupComplete || setupInProgress || paymentInProgress}
          onPress={onReturnPress}>
          return (-$150.00)
        </Button>
        <Button
          mode="contained"
          disabled={!setupComplete || setupInProgress || paymentInProgress}
          onPress={() => onCheckoutPress(5000)}>
          checkout ($50.00)
        </Button>
        <Button
          mode="contained"
          disabled={!setupComplete || setupInProgress || paymentInProgress}
          onPress={onPlaceHoldPress}>
          hold ($200.00)
        </Button>
        <Button
          mode="contained"
          disabled={!setupComplete || setupInProgress || paymentInProgress}
          onPress={onCaptureHoldPress}>
          payment($50.00)
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