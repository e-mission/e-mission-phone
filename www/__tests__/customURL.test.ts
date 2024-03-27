import { onLaunchCustomURL } from '../js/splash/customURL';

describe('onLaunchCustomURL', () => {
  let mockHandler;

  beforeEach(() => {
    // create a new mock handler before each test case.
    mockHandler = jest.fn();
  });

  it('tests valid url 1 - should call handler callback with valid URL and the handler should be called with correct parameters', () => {
    const validURL = 'emission://login_token?token=nrelop_dev-emulator-program';
    const expectedURL = 'login_token?token=nrelop_dev-emulator-program';
    const expectedComponents = { route: 'login_token', token: 'nrelop_dev-emulator-program' };
    onLaunchCustomURL(validURL, mockHandler);
    expect(mockHandler).toHaveBeenCalledWith(expectedURL, expectedComponents);
  });

  it('tests valid url 2 - should call handler callback with valid URL and the handler should be called with correct parameters', () => {
    const validURL = 'emission://test?param1=first&param2=second';
    const expectedURL = 'test?param1=first&param2=second';
    const expectedComponents = { route: 'test', param1: 'first', param2: 'second' };
    onLaunchCustomURL(validURL, mockHandler);
    expect(mockHandler).toHaveBeenCalledWith(expectedURL, expectedComponents);
  });

  it('test invalid url 1 - should not call handler callback with invalid URL', () => {
    const invalidURL = 'invalid_url';
    onLaunchCustomURL(invalidURL, mockHandler);
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('tests invalid url 2 - should not call handler callback with invalid URL', () => {
    const invalidURL = '';
    onLaunchCustomURL(invalidURL, mockHandler);
    expect(mockHandler).not.toHaveBeenCalled();
  });
});
