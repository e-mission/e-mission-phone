import {uploadFile} from "../js/control/uploadService";
import { mockLogger } from '../__mocks__/globalMocks';
import { mockDevice, mockGetAppVersion, mockCordova, mockFile } from "../__mocks__/cordovaMocks";
import { mockFileSystem } from "../__mocks__/fileSystemMocks";

mockDevice();
// this mocks cordova-plugin-app-version, generating a "Mock App", version "1.2.3"
mockGetAppVersion();
mockCordova();
mockFile();
mockFileSystem();

mockLogger();

// mock for JavaScript 'fetch'
// we emulate a 100ms delay when i) fetching data and ii) parsing it as text
global.fetch = (url: string, options: {method: string, headers: {}, body: string}) => new Promise((rs, rj) => {
  setTimeout(() => rs({
    text: () => new Promise((rs, rj) => {
      setTimeout(() => rs(new Response('sent ' + options.method + options.body + ' to ' + url)), 100);
    })
  }));
}) as any;

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ url: "http://localhost:5647/phonelogs" }),
  }),
) as any

//this is never used in production right now
//however, tests are still important to make sure the code works
//at some point we hope to restore this functionality
it('posts the logs to the configured database', async () => {
  const posted = await uploadFile("loggerDB", "HelloWorld");
  expect(posted).toEqual(expect.stringContaining("HelloWorld"));
  expect(posted).toEqual(expect.stringContaining("POST"));
});