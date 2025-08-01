import Bottleneck from 'bottleneck';
import { logDebug, logWarn } from '../plugin/logger';
import {
  CompositeTrip,
  ConfirmedPlace,
  isTrip,
  TimelineEntry,
  UnprocessedTrip,
} from '../types/diaryTypes';
import { Point } from 'geojson';
import { useEffect, useState } from 'react';
import { NominatimResponse } from '../types/apiTypes';
import { AlertManager } from '../components/AlertBar';

const GEOCODING_API_URL = 'https://nominatim.openstreetmap.org';
const nominatimLimiter = new Bottleneck({ maxConcurrent: 2, minTime: 500 });

// accepts a nominatim response object and returns an address-like string
// e.g. "Main St, San Francisco"
function toAddressName(data?: NominatimResponse) {
  const address = data?.['address'];
  if (address) {
    /* Sometimes, the street name ('road') isn't found and is undefined.
      If so, fallback to 'pedestrian' or 'suburb' or 'neighbourhood' */
    const placeName =
      address['road'] ||
      address['pedestrian'] ||
      address['suburb'] ||
      address['neighbourhood'] ||
      '';
    /* This could be either a city or town. If neither, fallback to 'county' */
    const municipalityName = address['city'] || address['town'] || address['county'] || '';
    return `${placeName}, ${municipalityName}`;
  }
}

let nominatimError: Error;
// fetches nominatim data for a given location and stores it using the coordinates as the key
// if the address name is already cached, it skips the fetch
async function getLocName(loc_geojson: Point): Promise<string | undefined> {
  const coordsStr = loc_geojson.coordinates.toString();
  const cachedResponse = localStorage.getItem(coordsStr);
  if (cachedResponse) {
    logDebug(`fetchNominatimLocName: found cached response for ${coordsStr}`);
    return toAddressName(JSON.parse(cachedResponse));
  }
  logDebug('Getting location name for ' + JSON.stringify(coordsStr));
  const data = await nominatimLimiter.schedule(() => fetchNominatim(loc_geojson));
  if (data) {
    localStorage.setItem(coordsStr, JSON.stringify(data));
    return toAddressName(data);
  }
}

async function fetchNominatim(loc_geojson: Point): Promise<NominatimResponse | undefined> {
  const url =
    GEOCODING_API_URL +
    '/reverse?format=json&lat=' +
    loc_geojson.coordinates[1] +
    '&lon=' +
    loc_geojson.coordinates[0];
  try {
    const response = await fetch(url);
    const data = await response.json();
    logDebug(`while reading data from nominatim, 
      status = ${response.status}; 
      data = ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    if (!nominatimError) {
      nominatimError = error;
      const msg = `Error fetching location name\n${nominatimError}`;
      logWarn(msg);
      AlertManager.addMessage({ text: msg });
    }
  }
}

function useTripAddressNames(trip: CompositeTrip | UnprocessedTrip) {
  const [startLocName, setStartLocName] = useState<string>('');
  const [endLocName, setEndLocName] = useState<string>('');

  useEffect(() => {
    if (trip.key == 'analysis/composite_trip' && trip.start_confirmed_place?.display_name) {
      setStartLocName(trip.start_confirmed_place.display_name);
    } else if (trip.start_loc) {
      getLocName(trip.start_loc).then((n) => setStartLocName(n || ''));
    }
  }, [trip, startLocName]);

  useEffect(() => {
    if (trip.key == 'analysis/composite_trip' && trip.end_confirmed_place?.display_name) {
      setEndLocName(trip.end_confirmed_place.display_name);
    } else if (trip.end_loc) {
      getLocName(trip.end_loc).then((n) => setEndLocName(n || ''));
    }
  }, [trip, endLocName]);

  return [startLocName, endLocName];
}

function usePlaceAddressName(place: ConfirmedPlace) {
  const [placeName, setPlaceName] = useState<string>('');

  useEffect(() => {
    if (place.display_name) {
      setPlaceName(place.display_name);
    } else if (place.location) {
      getLocName(place.location).then((n) => setPlaceName(n || ''));
    }
  }, [place]);

  return [placeName];
}

export default function useAddressNames(tlEntry: TimelineEntry): string[] {
  if (isTrip(tlEntry)) {
    return useTripAddressNames(tlEntry);
  } else {
    return usePlaceAddressName(tlEntry);
  }
}
