import {
  checkAndGetLibrarySetupStatus,
  checkinLibraryVehicle,
  checkoutLibraryVehicle,
  createLibrarySetupSession,
  getLibraryRentalHistory,
  getLibrarySetupStatus,
  getLibraryStations,
} from '../js/library/serverComm';

// Captures the resolve/reject callbacks passed to pushGetJSON so tests can control them
let lastPushGetJSON: {
  path: string;
  body: Record<string, any>;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
} | null = null;

beforeEach(() => {
  lastPushGetJSON = null;
  (window as any).cordova = {
    plugins: {
      BEMServerComm: {
        pushGetJSON: jest.fn((path, msgFiller, resolve, reject) => {
          const body = {};
          msgFiller(body);
          lastPushGetJSON = { path, body, resolve, reject };
        }),
      },
    },
  };
});

function resolveWith(value: any) {
  lastPushGetJSON!.resolve(value);
}

function rejectWith(reason: any) {
  lastPushGetJSON!.reject(reason);
}

describe('getLibraryStations', () => {
  it('returns stations on valid response', async () => {
    const promise = getLibraryStations();
    resolveWith({ stations: [{ station_id: 'st-1' }] });
    const result = await promise;
    expect(result.stations).toHaveLength(1);
    expect(lastPushGetJSON!.path).toBe('/library/stations');
  });

  it('throws on invalid response', async () => {
    const promise = getLibraryStations();
    resolveWith({});
    await expect(promise).rejects.toThrow('Invalid /library/stations response');
  });

  it('rejects when server errors', async () => {
    const promise = getLibraryStations();
    rejectWith(new Error('network error'));
    await expect(promise).rejects.toThrow('network error');
  });
});

describe('createLibrarySetupSession', () => {
  it('returns session on valid response', async () => {
    const promise = createLibrarySetupSession();
    resolveWith({ id: 'cs_123', url: 'https://checkout.stripe.com/cs_123' });
    const result = await promise;
    expect(result.id).toBe('cs_123');
    expect(lastPushGetJSON!.path).toBe('/library/setup/create');
  });
});

describe('getLibrarySetupStatus', () => {
  it('returns status on valid response', async () => {
    const promise = getLibrarySetupStatus();
    resolveWith({ payment_setup_status: 'SUCCEEDED' });
    const result = await promise;
    expect(result.payment_setup_status).toBe('SUCCEEDED');
    expect(lastPushGetJSON!.path).toBe('/library/setup/get_status');
  });

  it('throws on invalid response', async () => {
    const promise = getLibrarySetupStatus();
    resolveWith({});
    await expect(promise).rejects.toThrow('Invalid /library/setup/get_status response');
  });
});

describe('checkAndGetLibrarySetupStatus', () => {
  it('returns status for valid callback path', async () => {
    const promise = checkAndGetLibrarySetupStatus('/payment/setup/success');
    resolveWith({ payment_setup_status: 'SUCCEEDED' });
    const result = await promise;
    expect(result.payment_setup_status).toBe('SUCCEEDED');
    expect(lastPushGetJSON!.path).toBe('/library/setup/check_and_get_status');
    expect(lastPushGetJSON!.body).toMatchObject({ callback_status: 'success' });
  });

  it('throws when callback path does not start with /payment', async () => {
    await expect(checkAndGetLibrarySetupStatus('/other/path')).rejects.toThrow(
      'must start with /payment',
    );
  });

  it('throws on invalid server response', async () => {
    const promise = checkAndGetLibrarySetupStatus('/payment/setup/cancel');
    resolveWith({});
    await expect(promise).rejects.toThrow('Invalid /library/setup/check_and_get_status response');
  });
});

describe('checkoutLibraryVehicle', () => {
  it('returns checkout result on valid response', async () => {
    const promise = checkoutLibraryVehicle('bike-1', 38000);
    resolveWith({ result: 'checked_out', vehicle_id: 'bike-1' });
    const result = await promise;
    expect(result.result).toBe('checked_out');
    expect(lastPushGetJSON!.path).toBe('/library/checkout');
    expect(lastPushGetJSON!.body).toMatchObject({ vehicle_id: 'bike-1', hold_amount_cents: 38000 });
  });

  it('throws on invalid response', async () => {
    const promise = checkoutLibraryVehicle('bike-1', 38000);
    resolveWith({ result: 'checked_out' }); // missing vehicle_id
    await expect(promise).rejects.toThrow('Invalid /library/checkout response');
  });
});

describe('checkinLibraryVehicle', () => {
  it('returns checkin result on valid response', async () => {
    const promise = checkinLibraryVehicle('dock-1');
    resolveWith({ result: 'checked_in', vehicle_id: 'bike-1', dock_id: 'dock-1' });
    const result = await promise;
    expect(result.result).toBe('checked_in');
    expect(lastPushGetJSON!.path).toBe('/library/checkin');
    expect(lastPushGetJSON!.body).toMatchObject({ dock_id: 'dock-1' });
  });

  it('throws when response is missing dock_id', async () => {
    const promise = checkinLibraryVehicle('dock-1');
    resolveWith({ result: 'checked_in', vehicle_id: 'bike-1' }); // missing dock_id
    await expect(promise).rejects.toThrow('Invalid /library/checkin response');
  });
});

describe('getLibraryRentalHistory', () => {
  it('returns history on valid response', async () => {
    const promise = getLibraryRentalHistory();
    resolveWith({
      rental_history: [
        { vehicle_id: 'bike-1', start_ts: 1000, end_ts: null, rental_status: 'active' },
      ],
    });
    const result = await promise;
    expect(result.rental_history).toHaveLength(1);
    expect(lastPushGetJSON!.path).toBe('/library/rental_history');
  });

  it('throws on invalid response', async () => {
    const promise = getLibraryRentalHistory();
    resolveWith({});
    await expect(promise).rejects.toThrow('Invalid /library/rental_history response');
  });
});
