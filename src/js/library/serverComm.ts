export type CheckoutSession = {
  id: string;
  url: string;
};

export type LibrarySetupCallback = {
  callback_status: string;
  result: LibrarySetupStatus;
};

export type LibrarySetupStatusValue =
  | 'NOT_STARTED'
  | 'WAITING_FOR_USER'
  | 'EXPIRED'
  | 'SUCCEEDED'
  | 'FAILED';

export type LibrarySetupStatus = {
  payment_setup_status: LibrarySetupStatusValue;
  is_sandbox: boolean;
};

export type LibraryCheckoutResultValue = 'checked_out' | 'checked_in';

export type LibraryCheckoutResult = {
  result: LibraryCheckoutResultValue;
  vehicle_id: string;
  dock_id?: string;
};

export type LibraryStation = Record<string, any>;

export type LibraryStationsResponse = {
  stations: LibraryStation[];
};

import { Point } from 'geojson';
import { logDebug, logWarn } from '../plugin/logger';

/* 'initializing' is the cold-start pairing state: an admin checks out a vehicle whose location is
  UNINITIALIZED, then docks it to seed the library. No payment is involved. */
export type LibraryRentalStatus = 'active' | 'initializing' | 'completed';

export type LibraryPaymentHoldInfo = {
  id?: string;
  status?: PaymentIntentStatus | string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
};

export type LibraryVehicle = {
  vehicle_id: string | null;
  vehicle_name?: string | null;
  location?: string | null;
  bluetooth_major_minor?: string[] | null;
  baseMode?: string | null;
  met_equivalent?: number | null;
  kgCo2PerKm?: number | null;
  vehicle_info?: Record<string, any> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LibraryRental = {
  vehicle_id: string;
  vehicle_name?: string;
  payment_hold_info?: LibraryPaymentHoldInfo;
  start_ts: number;
  start_local_dt?: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    weekday: number;
    timezone: string;
  };
  start_fmt_time?: string;
  end_ts: number | null;
  end_local_dt?: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    weekday: number;
    timezone: string;
  } | null;
  end_fmt_time?: string;
  start_dock_id?: string;
  start_loc?: Point;
  end_dock_id?: string;
  end_loc?: Point | null;
  rental_status: LibraryRentalStatus;
};

export type LibraryRentalHistory = {
  rental_history: LibraryRental[];
};

/* Error passed to pushGetJSON's error callback; status/body are only set for HTTP error responses */
export type ServerCommError = Error & {
  status?: number;
  body?: { error?: string } | string;
};

/* The server's own error text if it sent one, otherwise the generic plugin message */
export function getServerErrorMessage(e: ServerCommError): string {
  const body = (e as ServerCommError)?.body;
  if (body && typeof body === 'object' && body.error) {
    return (e.status ? `${e.status}: ` : '') + body.error;
  }
  return e instanceof Error ? e.message : String(e);
}

function callLibraryServer(path: string, body: Record<string, any>) {
  return new Promise<any>((resolve, reject) => {
    const startTs = Date.now();
    const elapsed = () => `${Date.now() - startTs}ms`;
    logDebug(`callLibraryServer(${path}): calling pushGetJSON with body ${JSON.stringify(body)}`);
    const hangTimer = setTimeout(
      () => logWarn(`callLibraryServer(${path}): no resolve/reject after ${elapsed()}`),
      30000,
    );
    const msgFiller = (message: Record<string, any>) => {
      Object.assign(message, body);
      logDebug(`callLibraryServer(${path}): msgFiller produced ${JSON.stringify(message)}`);
      return message;
    };
    try {
      (window as any).cordova.plugins.BEMServerComm.pushGetJSON(
        path,
        msgFiller,
        (response: any) => {
          clearTimeout(hangTimer);
          logDebug(
            `callLibraryServer(${path}): resolved after ${elapsed()} with ${JSON.stringify(response)}`,
          );
          resolve(response);
        },
        (error: ServerCommError) => {
          clearTimeout(hangTimer);
          logWarn(
            `callLibraryServer(${path}): rejected after ${elapsed()} with status ${error?.status}, message ${error?.message}, body ${JSON.stringify(error?.body)}`,
          );
          reject(error);
        },
      );
      logDebug(`callLibraryServer(${path}): pushGetJSON returned synchronously`);
    } catch (e) {
      clearTimeout(hangTimer);
      logWarn(`callLibraryServer(${path}): pushGetJSON threw synchronously: ${e}`);
      reject(e);
    }
  });
}

/* Dev-only: server responds 404 for an unknown vehicle_id */
export function testCheckoutNonexistentVehicle() {
  return callLibraryServer('/library/checkout', {
    vehicle_id: 'nonexistent-vehicle',
    hold_amount_cents: 0,
  });
}

export async function getLibraryStations(): Promise<LibraryStationsResponse> {
  const result = await callLibraryServer('/library/stations', {});
  if (result?.stations) {
    return result as LibraryStationsResponse;
  }
  throw new Error(`Invalid /library/stations response: ${JSON.stringify(result)}`);
}

export async function createLibrarySetupSession(): Promise<CheckoutSession> {
  const result = await callLibraryServer('/library/setup/create', {});
  return result as CheckoutSession;
  throw new Error(`Invalid /library/setup/create response: ${JSON.stringify(result)}`);
}

export async function getLibrarySetupStatus(): Promise<LibrarySetupStatus> {
  const result = await callLibraryServer('/library/setup/get_status', {});
  if (result?.payment_setup_status) {
    return result as LibrarySetupStatus;
  }
  throw new Error(`Invalid /library/setup/get_status response: ${JSON.stringify(result)}`);
}

export async function checkAndGetLibrarySetupStatus(
  callback_path: string,
): Promise<LibrarySetupStatus> {
  const callback_path_parts = callback_path.replace(/^\/+/, '').split('/');
  const callback_module = callback_path_parts[0];
  if (callback_module !== 'payment') {
    throw new Error(`Invalid callback path ${callback_path}: must start with /payment`);
  }
  const callback_status = callback_path_parts[callback_path_parts.length - 1];
  if (!callback_status) {
    throw new Error(`Invalid callback path ${callback_path}: missing callback status`);
  }
  console.log(`checkAndGetLibrarySetupStatus: callback_status = ${callback_status}`);
  const result = await callLibraryServer('/library/setup/check_and_get_status', {
    callback_status,
  });
  if (result?.payment_setup_status) {
    return result as LibrarySetupStatus;
  }
  throw new Error(
    `Invalid /library/setup/check_and_get_status response: ${JSON.stringify(result)}`,
  );
}

export async function checkoutLibraryVehicle(
  vehicle_id: string,
  hold_amount_cents: number,
): Promise<LibraryCheckoutResult> {
  const result = await callLibraryServer('/library/checkout', { vehicle_id, hold_amount_cents });
  if (result?.result && result?.vehicle_id) {
    return result as LibraryCheckoutResult;
  }
  throw new Error(`Invalid /library/checkout response: ${JSON.stringify(result)}`);
}

export async function checkinLibraryVehicle(dock_id: string): Promise<LibraryCheckoutResult> {
  const result = await callLibraryServer('/library/checkin', { dock_id });
  if (result?.result && result?.vehicle_id && result?.dock_id) {
    return result as LibraryCheckoutResult;
  }
  throw new Error(`Invalid /library/checkin response: ${JSON.stringify(result)}`);
}

export async function getLibraryRentalHistory(): Promise<LibraryRentalHistory> {
  const result = await callLibraryServer('/library/rental_history', {});
  if (result?.rental_history) {
    return result as LibraryRentalHistory;
  }
  throw new Error(`Invalid /library/rental_history response: ${JSON.stringify(result)}`);
}
