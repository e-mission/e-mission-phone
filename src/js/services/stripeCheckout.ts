import { displayError } from "../plugin/logger";

export type CheckoutSessionStatus = 'open' | 'complete' | 'completed' | 'expired';

export type CheckoutSession = {
  id: string;
  url?: string;
  status?: CheckoutSessionStatus;
  expires_at?: number;
  mode?: 'setup' | 'payment' | 'subscription';
  setup_intent?: string;
  customer?: string;
};

export type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'requires_action'
  | 'processing'
  | 'requires_capture'
  | 'canceled'
  | 'succeeded';

export type PaymentIntent = {
  id: string;
  status?: PaymentIntentStatus;
  client_secret?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
};

export type RefundStatus = 'pending' | 'requires_action' | 'succeeded' | 'failed' | 'canceled';

export type Refund = {
  id: string;
  status?: RefundStatus;
  amount?: number;
  currency?: string;
  payment_intent?: string;
};

export type LibrarySetupCallback = {
  callback_status: string;
  result: any;
};

type PaymentMethod = {
  id: string;
};

const STRIPE_API_BASE_ENV = process.env.STRIPE_API_BASE || '';
const STRIPE_SECRET_KEY_ENV = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_SUCCESS_URL_ENV = process.env.STRIPE_SUCCESS_URL || '';
const STRIPE_CANCEL_URL_ENV = process.env.STRIPE_CANCEL_URL || '';

const STRIPE_API_BASE =
  STRIPE_API_BASE_ENV ||
  'https://api.stripe.com/v1';

export function isDirectStripeModeEnabled() {
  return true;
}

function getDirectStripeSecretKey() {
  console.log(`STRIPE_SECRET_KEY_ENV starts with '${STRIPE_SECRET_KEY_ENV?.substring(0, 3)}...'`);
  return STRIPE_SECRET_KEY_ENV;
}

function normalizeSession(sessionLike: any): CheckoutSession {
  return {
    id: sessionLike?.id,
    url: sessionLike?.url,
    status: sessionLike?.status,
    expires_at: sessionLike?.expires_at,
    mode: sessionLike?.mode,
    setup_intent:
      typeof sessionLike?.setup_intent === 'string'
        ? sessionLike?.setup_intent
        : sessionLike?.setup_intent?.id,
    customer: sessionLike?.customer,
  };
}

function normalizePaymentIntent(paymentIntentLike: any): PaymentIntent {
  return {
    id: paymentIntentLike?.id,
    status: paymentIntentLike?.status,
    client_secret: paymentIntentLike?.client_secret,
    amount: paymentIntentLike?.amount,
    currency: paymentIntentLike?.currency,
    metadata: paymentIntentLike?.metadata,
  };
}

function normalizeRefund(refundLike: any): Refund {
  return {
    id: refundLike?.id,
    status: refundLike?.status,
    amount: refundLike?.amount,
    currency: refundLike?.currency,
    payment_intent:
      typeof refundLike?.payment_intent === 'string'
        ? refundLike?.payment_intent
        : refundLike?.payment_intent?.id,
  };
}

function toFormBody(data: Record<string, any>) {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    body.append(k, String(v));
  });
  return body;
}

function callLibraryServer(path: string, body: Record<string, any>) {
  // TODO: better error handling for the reject case, right now, it just 
  // hangs with no error
  return new Promise<any>((resolve, reject) => {
    const msgFiller = (message: Record<string, any>) => Object.assign(message, body);
    (window as any).cordova.plugins.BEMServerComm.pushGetJSON(path, msgFiller, resolve, reject);
  });
}

async function directStripeRequest(
  path: string,
  method: 'GET' | 'POST',
  queryOrBody: Record<string, any>,
) {
  const secretKey = getDirectStripeSecretKey();
  if (!secretKey) {
    throw new Error('Direct Stripe mode enabled but STRIPE_SECRET_KEY is missing');
  }

  const query = new URLSearchParams();
  Object.entries(queryOrBody).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    query.append(k, String(v));
  });

  const url = `${STRIPE_API_BASE}${path}${method === 'GET' ? `?${query.toString()}` : ''}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(method === 'POST' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    ...(method === 'POST' ? { body: toFormBody(queryOrBody).toString() } : {}),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stripe ${method} ${path} failed: ${response.status} ${text}`);
  }
  return response.json();
}

async function ensureCustomerForPaymentMethod(
  paymentMethodId: string,
  customerId?: string,
): Promise<string> {
  console.log(`ensureCustomerForPaymentMethod: paymentMethodId=${paymentMethodId}, customerId=${customerId}`);
  let resolvedCustomerId = customerId || '';

  if (!resolvedCustomerId) {
    const createdCustomer = await directStripeRequest('/customers', 'POST', {
      description: 'Library tab reusable payment method holder',
    });
    resolvedCustomerId = createdCustomer?.id || '';
    if (!resolvedCustomerId) {
      throw new Error('Unable to create customer for reusable payment method');
    }
  }

  console.log(`Attaching payment method ${paymentMethodId} to customer ${resolvedCustomerId}`);
  await directStripeRequest(`/payment_methods/${paymentMethodId}/attach`, 'POST', {
    customer: resolvedCustomerId,
  });

  return resolvedCustomerId;
}

async function getMostRecentCompletedSetupCheckoutSession(): Promise<CheckoutSession> {
  const sessions = await listStripeCheckoutSessions({ status: 'complete', limit: 25 });
  const latestSetupSession = sessions.find(
    (session: CheckoutSession) => session.mode === 'setup' && Boolean(session.setup_intent),
  );
  if (!latestSetupSession) {
    throw new Error(
      'No completed setup checkout session found. Run setup checkout first to save payment details.',
    );
  }
  return latestSetupSession;
}

async function getReusablePaymentMethodFromSetupCheckout(
  setupCheckoutSessionId?: string,
): Promise<{ paymentMethodId: string; customerId: string; resolvedSetupCheckoutSessionId: string }> {
  const resolvedSetupCheckoutSessionId =
    setupCheckoutSessionId || (await getMostRecentCompletedSetupCheckoutSession()).id;

  const expandedSession = await directStripeRequest(
    `/checkout/sessions/${resolvedSetupCheckoutSessionId}`,
    'GET',
    { 'expand[]': 'setup_intent' },
  );

  const setupIntentObject = expandedSession?.setup_intent;
  const paymentMethodId =
    typeof setupIntentObject?.payment_method === 'string'
      ? setupIntentObject.payment_method
      : setupIntentObject?.payment_method?.id;
  const customerId = setupIntentObject?.customer || expandedSession?.customer || '';

  if (!setupIntentObject) {
    throw new Error('Checkout Session has no setup_intent; run setup checkout again');
  }
  if (!paymentMethodId) {
    throw new Error('Previous setup checkout session does not have a reusable payment method yet.');
  }

  const attachedCustomerId = await ensureCustomerForPaymentMethod(paymentMethodId, customerId);

  return {
    paymentMethodId,
    customerId: attachedCustomerId,
    resolvedSetupCheckoutSessionId,
  };
}

export async function createStripeCheckoutSession(mode: 'setup' | 'payment' | 'subscription') {
  const result = await callLibraryServer('/library/setup/create', {});
  const session = normalizeSession(result);
  if (!session?.id || !session?.url) {
    displayError(result, 'Invalid direct Stripe Checkout Session create response: missing id or url');
  }
  return session;
}

export async function finalizeStripeCheckoutSession(
  callback_path: string,
): Promise<LibrarySetupCallback> {
  const callback_path_parts = callback_path.replace(/^\/+/, '').split('/');
  const callback_module = callback_path_parts[0];
  if (callback_module !== 'payment') {
    throw new Error(`Invalid callback path ${callback_path}: must start with /payment`);
  }
  const callback_status = callback_path_parts[callback_path_parts.length - 1];
  if (!callback_status) {
    throw new Error(`Invalid callback path ${callback_path}: missing callback status`);
  }
  console.log(`finalizeStripeCheckoutSession: callback_status = ${callback_status}`);
  const result = await callLibraryServer('/library/setup/finalize', { callback_status });
  return { callback_status, result };
}

export async function getLibrarySetupStatus(): Promise<CheckoutSession> {
  const result = await callLibraryServer('/library/setup/status', {});

  const session = normalizeSession(
    result?.session || result?.checkout_session || result?.stripe_checkout_session || result,
  );

  if (session?.id) {
    return session;
  }

  throw new Error(`Invalid library/setup/status response: ${JSON.stringify(result)}`);
}


export async function listStripeCheckoutSessions(
  params: Record<string, any> = {},
): Promise<CheckoutSession[]> {
  const result = await directStripeRequest('/checkout/sessions', 'GET', params);
  const data = Array.isArray(result?.data) ? result.data : [];
  return data.map(normalizeSession).filter((s: CheckoutSession) => Boolean(s.id));
}

export async function retrieveStripeCheckoutSession(sessionId: string): Promise<CheckoutSession> {
  const result = await directStripeRequest(`/checkout/sessions/${sessionId}`, 'GET', {});
  const session = normalizeSession(result);
  if (!session?.id) {
    throw new Error('Invalid direct Stripe Checkout Session retrieve response: missing id');
  }
  return session;
}

export async function createStripePaymentIntent(
  amountCents: number,
  setupCheckoutSessionId?: string,
): Promise<PaymentIntent> {
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new Error(
      `Invalid PaymentIntent amount '${amountCents}'. PaymentIntent amount must be a positive integer in cents.`,
    );
  }

  const {
    paymentMethodId,
    customerId: attachedCustomerId,
    resolvedSetupCheckoutSessionId,
  } = await getReusablePaymentMethodFromSetupCheckout(setupCheckoutSessionId);

  const result = await directStripeRequest('/payment_intents', 'POST', {
    amount: amountCents,
    currency: 'usd',
    payment_method: paymentMethodId,
    confirm: true,
    'automatic_payment_methods[enabled]': true,
    'automatic_payment_methods[allow_redirects]': 'never',
    customer: attachedCustomerId,
    'metadata[kind]': 'debit',
    'metadata[setup_checkout_session_id]': resolvedSetupCheckoutSessionId,
  });
  const paymentIntent = normalizePaymentIntent(result);
  if (!paymentIntent?.id) {
    throw new Error('Invalid direct Stripe PaymentIntent response: missing id');
  }
  return paymentIntent;
}

export async function createStripeHoldPaymentIntent(
  amountCents: number,
  setupCheckoutSessionId?: string,
): Promise<PaymentIntent> {
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new Error(
      `Invalid hold amount '${amountCents}'. Hold amount must be a positive integer in cents.`,
    );
  }

  const {
    paymentMethodId,
    customerId: attachedCustomerId,
    resolvedSetupCheckoutSessionId,
  } = await getReusablePaymentMethodFromSetupCheckout(setupCheckoutSessionId);

  const result = await directStripeRequest('/payment_intents', 'POST', {
    amount: amountCents,
    currency: 'usd',
    payment_method: paymentMethodId,
    confirm: true,
    capture_method: 'manual',
    'automatic_payment_methods[enabled]': true,
    'automatic_payment_methods[allow_redirects]': 'never',
    customer: attachedCustomerId,
    'metadata[kind]': 'hold',
    'metadata[setup_checkout_session_id]': resolvedSetupCheckoutSessionId,
  });
  const paymentIntent = normalizePaymentIntent(result);
  if (!paymentIntent?.id) {
    throw new Error('Invalid direct Stripe hold PaymentIntent response: missing id');
  }
  return paymentIntent;
}

export async function retrieveStripePaymentIntent(
  paymentIntentId: string,
): Promise<PaymentIntent> {
  const result = await directStripeRequest(`/payment_intents/${paymentIntentId}`, 'GET', {});
  const paymentIntent = normalizePaymentIntent(result);
  if (!paymentIntent?.id) {
    throw new Error('Invalid direct Stripe PaymentIntent retrieve response: missing id');
  }
  return paymentIntent;
}

async function getMostRecentSuccessfulDebitPaymentIntentId(): Promise<string> {
  const result = await directStripeRequest('/payment_intents', 'GET', { limit: 25 });
  const intents = Array.isArray(result?.data) ? result.data.map(normalizePaymentIntent) : [];
  const latestDebit = intents.find((intent: PaymentIntent) => intent.status === 'succeeded');
  if (!latestDebit?.id) {
    throw new Error('No successful debit PaymentIntent found to refund. Run checkout first.');
  }
  return latestDebit.id;
}

async function getMostRecentAuthorizedHoldPaymentIntentId(): Promise<string> {
  const result = await directStripeRequest('/payment_intents', 'GET', { limit: 25 });
  const intents = Array.isArray(result?.data) ? result.data.map(normalizePaymentIntent) : [];
  const latestAuthorizedHold = intents.find(
    (intent: PaymentIntent) =>
      intent.status === 'requires_capture' && intent.metadata?.kind === 'hold',
  );
  if (!latestAuthorizedHold?.id) {
    throw new Error('No authorized hold PaymentIntent found to capture. Place hold first.');
  }
  return latestAuthorizedHold.id;
}

export async function captureStripeHoldPaymentIntent(amountCents: number): Promise<PaymentIntent> {
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new Error(
      `Invalid capture amount '${amountCents}'. Capture amount must be a positive integer in cents.`,
    );
  }

  const paymentIntentId = await getMostRecentAuthorizedHoldPaymentIntentId();
  const result = await directStripeRequest(`/payment_intents/${paymentIntentId}/capture`, 'POST', {
    amount_to_capture: amountCents,
  });
  const paymentIntent = normalizePaymentIntent(result);
  if (!paymentIntent?.id) {
    throw new Error('Invalid direct Stripe capture response: missing id');
  }
  return paymentIntent;
}

export async function createStripeRefund(amountCents: number): Promise<Refund> {
  if (!Number.isInteger(amountCents) || amountCents < 1) {
    throw new Error(
      `Invalid Refund amount '${amountCents}'. Refund amount must be a positive integer in cents.`,
    );
  }

  const paymentIntentId = await getMostRecentSuccessfulDebitPaymentIntentId();

  const result = await directStripeRequest('/refunds', 'POST', {
    payment_intent: paymentIntentId,
    amount: amountCents,
    reason: 'requested_by_customer',
  });
  const refund = normalizeRefund(result);
  if (!refund?.id) {
    throw new Error('Invalid direct Stripe Refund response: missing id');
  }
  return refund;
}
