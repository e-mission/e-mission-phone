import { publish, subscribe, unsubscribe } from '../js/customEventHandler';

it('subscribes and publishes to an event', () => {
  const listener = jest.fn();
  subscribe('test', listener);
  publish('test', 'test data');
  expect(listener).toHaveBeenCalledWith(
    expect.objectContaining({
      type: 'test',
      detail: 'test data',
    }),
  );
});

it('can unsubscribe', () => {
  const listener = jest.fn();
  subscribe('test', listener);
  unsubscribe('test', listener);
  publish('test', 'test data');
  expect(listener).not.toHaveBeenCalled();
});
