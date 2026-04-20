//this is never used in production right now
//however, tests are still important to make sure the code works
//at some point we hope to restore this functionality

import { uploadFile } from '../js/control/uploadService';

//use this message to verify that the post went through
let message = '';

//each have a slight delay to mimic a real fetch request
global.fetch = (url: string, options: { method: string; headers: {}; body: string }) =>
  new Promise((rs, rj) => {
    //if there's options, that means there is a post request
    if (options) {
      message = 'sent ' + options.method + options.body + ' for ' + url;
      setTimeout(() => {
        rs('sent ' + options.method + options.body + ' to ' + url);
      }, 100);
    }
    //else it is a get request
    else {
      setTimeout(() =>
        rs({
          json: () =>
            new Promise((rs, rj) => {
              setTimeout(() => rs('mock data for ' + url), 100);
            }),
        }),
      );
    }
  }) as any;

window.alert = (message) => {
  console.log(message);
};

//very basic tests - difficult to do too much since there's a lot of mocking involved
it('posts the logs to the configured database', async () => {
  let posted = await uploadFile('loggerDB', 'HelloWorld');
  expect(message).toEqual(expect.stringContaining('HelloWorld'));
  expect(message).toEqual(expect.stringContaining('POST'));
  posted = await uploadFile('loggerDB', 'second test');
  expect(message).toEqual(expect.stringContaining('second test'));
  expect(message).toEqual(expect.stringContaining('POST'));
}, 10000);
