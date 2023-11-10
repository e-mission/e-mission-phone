const { expect, $ } = require('@wdio/globals');

describe('Connect test', () => {
  it('should call app successfully', async () => {
    const selectorIOS = await $('UIATarget.localTarget().frontMostApp().mainWindow()');
    const selectorAndroid = await $(
      'android=new UiSelector().className("android.widget.FrameLayout")',
    );
    const selector = driver.isAndroid ? selectorAndroid : selectorIOS;
    expect(selector).toBeDisplayed();
  });
});
