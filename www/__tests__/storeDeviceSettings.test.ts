import { initDeviceSettings, afterConsentStore, afterIntroStore } from '../js/splash/storedevicesettings';
import { mockBEMUserCache, mockDevice, mockGetAppVersion, mockBEMDataCollection, mockBEMServerCom, mockCordova } from '../__mocks__/cordovaMocks';
import { mockLogger } from '../__mocks__/globalMocks';
import { storageClear } from '../js/plugin/storage';
import { getUser } from '../js/commHelper';
import { markConsented, readConsentState } from '../js/splash/startprefs';
import { markIntroDone } from '../js/onboarding/onboardingHelper';

mockBEMUserCache();
mockDevice();
mockCordova();
mockLogger();
mockGetAppVersion();
mockBEMDataCollection();
mockBEMServerCom();

global.fetch = (url: string) => new Promise((rs, rj) => {
    setTimeout(() => rs({
        json: () => new Promise((rs, rj) => {
            let myJSON = { "emSensorDataCollectionProtocol": { "protocol_id": "2014-04-6267", "approval_date": "2016-07-14" } };
            setTimeout(() => rs(myJSON), 100);
        })
    }));
}) as any;

it('runs after consent is marked', async () => {
    await storageClear({ local: true, native: true });
    await readConsentState();
    await markConsented();
    await initDeviceSettings();
    let user = await getUser();
    expect(user).toMatchObject({
        client_os_version: '14.0.0',
        client_app_version: '1.2.3'
    })
});

it('does not run if consent is not marked', async () => {
    await storageClear({ local: true, native: true });
    await readConsentState();
    await initDeviceSettings();
    let user = await getUser();
    expect(user).toBeUndefined();
});

it('does not run after consent, if intro not done', async () => {
    await storageClear({ local: true, native: true });
    await afterConsentStore();
    let user = await getUser();
    expect(user).toBeUndefined();
})

it('runs after consent, if intro done', async () => {
    await storageClear({ local: true, native: true });
    await markIntroDone();
    await afterConsentStore();
    setTimeout(async () => {
        console.log("hello world");
        getUser().then((user) => {
            expect(user).toMatchObject({
                client_os_version: '14.0.0',
                client_app_version: '1.2.3'
            })
        });
    }, 5000);
});

it('runs after intro is done', async () => {
    await storageClear({ local: true, native: true });
    await afterIntroStore();
    let user = await getUser();
    expect(user).toMatchObject({
        client_os_version: '14.0.0',
        client_app_version: '1.2.3'
    })
});