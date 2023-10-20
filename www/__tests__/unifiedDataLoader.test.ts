import { mockLogger } from '../__mocks__/globalMocks';
import { combineWithDedup, combinedPromises, getUnifiedDataForInterval } from '../js/unifiedDataLoader'
import { ServerDataPoint } from '../js/types/diaryTypes';

mockLogger();

describe('combineWithDedup can', () => {
  const testOne : ServerDataPoint = {
    data: '',
    metadata: {
      key: '',
      platform: '',
      write_ts: 1, // the only value checked by combineWithDedup
      time_zone: '',
      write_fmt_time: '',
      write_local_dt: null,
    },
  };
  const testTwo = JSON.parse(JSON.stringify(testOne));
  testTwo.metadata.write_ts = 2;
  const testThree = JSON.parse(JSON.stringify(testOne));
  testThree.metadata.write_ts = 3;

  it('work with empty arrays', () => {
    expect(combineWithDedup([], [])).toEqual([]);
    expect(combineWithDedup([], [testOne])).toEqual([testOne]);
    expect(combineWithDedup([testOne, testTwo], [])).toEqual([testOne, testTwo]);
  });
  it('Can work with arrays of len 1', () => {
    expect(combineWithDedup([testOne], [testOne])).toEqual([testOne]);
    expect(combineWithDedup([testOne], [testTwo])).toEqual([testOne, testTwo]);
  });
  it('Can work with arrays of len > 1', () => {
    expect(combineWithDedup([testOne], [testOne, testTwo])).toEqual([testOne, testTwo]);
    expect(combineWithDedup([testOne], [testTwo, testTwo])).toEqual([testOne, testTwo]);
    expect(combineWithDedup([testOne, testTwo], [testTwo, testTwo])).toEqual([testOne, testTwo]);
    expect(combineWithDedup([testOne, testTwo, testThree], [testOne, testTwo])).toEqual([testOne, testTwo, testThree]);
  });
});
