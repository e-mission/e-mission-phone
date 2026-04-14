import React from 'react';
import { View, Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import { useTimelineContext } from '../js/TimelineContext';

jest.mock('../js/services/commHelper', () => ({
  getPipelineRangeTs: jest.fn(() => Promise.resolve({ start_ts: 1, end_ts: 10 })),
  getRawEntries: jest.fn((key_list, _, __) => {
    let phone_data: any[] = [];
    if (key_list.includes('analysis/composite_trip')) {
      phone_data = [
        {
          _id: { $oid: 'trip1' },
          metadata: { write_ts: 1, origin_key: 'analysis/confirmed_trip' },
          data: { start_ts: 1, end_ts: 2 },
        },
        {
          _id: { $oid: 'trip2' },
          metadata: { write_ts: 2, origin_key: 'analysis/confirmed_trip' },
          data: { start_ts: 3, end_ts: 4 },
        },
        {
          _id: { $oid: 'trip3' },
          metadata: { write_ts: 3, origin_key: 'analysis/confirmed_trip' },
          data: { start_ts: 5, end_ts: 6 },
        },
      ];
    }
    return Promise.resolve({ phone_data });
  }),
  fetchUrlCached: jest.fn(() => Promise.resolve(null)),
}));

// Mock useAppConfig default export
jest.mock('../js/useAppConfig', () => {
  return jest.fn(() => ({ intro: {} }));
});

const TimelineContextTestComponent = () => {
  const { timelineMap } = useTimelineContext();

  if (!timelineMap) return null;

  console.debug('timelineMap', timelineMap);

  return (
    <View testID="timeline-entries">
      {[...timelineMap.values()].map((entry, i) => (
        <Text key={i}>{'entry ID: ' + entry._id.$oid}</Text>
      ))}
    </View>
  );
};

describe('TimelineContext', () => {
  it('renders correctly', async () => {
    const { toJSON } = render(<TimelineContextTestComponent />);
    await waitFor(() => {
      const tree = toJSON();
      expect(tree).toBeTruthy();
      expect(JSON.stringify(tree)).toContain('entry ID: trip1');
      expect(JSON.stringify(tree)).toContain('entry ID: trip2');
      expect(JSON.stringify(tree)).toContain('entry ID: trip3');
    });
  });
});
