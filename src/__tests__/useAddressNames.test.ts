import { renderHook, waitFor } from '@testing-library/react-native';
import useAddressNames from '../js/diary/useAddressNames';
import { CompositeTrip, ConfirmedPlace } from '../js/types/diaryTypes';

global.fetch = (url) =>
  new Promise((rs, rj) => {
    if (url.endsWith('lat=39.740322&lon=-105.168467')) {
      // prettier-ignore
      rs({json: () => Promise.resolve({"place_id":385177537,"licence":"Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright","osm_type":"way","osm_id":69546971,"lat":"39.740274150000005","lon":"-105.16842343310245","display_name":"East Entrance Gate, Denver West Parkway, Applewood, Jefferson County, Colorado, 80410, United States","address":{"building":"East Entrance Gate","road":"Denver West Parkway","village":"Applewood","county":"Jefferson County","state":"Colorado","ISO3166-2-lvl4":"US-CO","postcode":"80410","country":"United States","country_code":"us"},"boundingbox":["39.7402185","39.7403381","-105.1684959","-105.1683483"]})});
    } else if (url.endsWith('lat=39.744749&lon=-105.150327')) {
      // prettier-ignore
      rs({json: () => Promise.resolve({"place_id":216339398,"licence":"Data © OpenStreetMap contributors, ODbL 1.0. https://osm.org/copyright","osm_type":"way","osm_id":359442199,"lat":"39.7447133","lon":"-105.14973971883751","display_name":"1840, Alkire Court, Golden, Jefferson County, Colorado, 80401, United States","address":{"house_number":"1840","road":"Alkire Court","city":"Golden","county":"Jefferson County","state":"Colorado","ISO3166-2-lvl4":"US-CO","postcode":"80401","country":"United States","country_code":"us"},"boundingbox":["39.744683","39.7447438","-105.1497927","-105.1496867"]})});
    }
  }) as any;

describe('useAddressNames', () => {
  it('should return location name for a confirmed place', async () => {
    const place = {
      key: 'analysis/confirmed_place',
      display_name: 'Third Street, City',
    } as any as ConfirmedPlace;
    const { result } = renderHook(() => useAddressNames(place));
    await waitFor(() => {
      const [locName] = result.current;
      expect(locName).toBe('Third Street, City');
    });
  });

  it('should return start and end location names for a composite trip', async () => {
    const trip = {
      key: 'analysis/composite_trip',
      start_confirmed_place: { display_name: 'First Street, City' },
      end_confirmed_place: { display_name: 'Second Street, City' },
    } as any as CompositeTrip;

    const { result } = renderHook(() => useAddressNames(trip));
    await waitFor(() => {
      const [startLocName, endLocName] = result.current;
      expect(startLocName).toBe('First Street, City');
      expect(endLocName).toBe('Second Street, City');
    });
  });

  it('should fetch start and end location names for an unprocessed trip', async () => {
    const trip = {
      key: 'analysis/composite_trip',
      start_loc: { coordinates: [-105.168467, 39.740322] },
      end_loc: { coordinates: [-105.150327, 39.744749] },
    } as any as CompositeTrip;

    const { result } = renderHook(() => useAddressNames(trip));
    await waitFor(() => {
      const [startLocName, endLocName] = result.current;
      expect(startLocName).toBe('Denver West Parkway, Jefferson County');
      expect(endLocName).toBe('Alkire Court, Golden');
    });
  });
});
