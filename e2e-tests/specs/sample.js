const { expect, $ } = require('@wdio/globals');

describe('Connect test', () => {
  it('should call app successfully', async () => {
    // todo : add selectorAndroid
    const selectorIOS = await $('UIATarget.localTarget().frontMostApp().mainWindow()');
    expect(selectorIOS).toBeDisplayed();
  });
});
