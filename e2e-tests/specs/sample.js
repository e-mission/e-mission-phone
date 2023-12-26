const { expect, $ } = require('@wdio/globals');

describe('Connect test', () => {
  it('should call app successfully', async () => {
    const selector = driver.isAndroid
      ? await $('android=new UiSelector().className("android.widget.FrameLayout")')
      : await $('UIATarget.localTarget().frontMostApp().mainWindow()');
    expect(selector).toBeDisplayed();
  });
});
