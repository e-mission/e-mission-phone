/* This is a temporary solution; localstorage is not a good long-term option and we should
  be looking to other key-value storage options in the React Native ecosystem. */

import { useEffect, useState, useRef, useContext } from 'react';

export type Listener<EventType> = (event: EventType) => void;

export type ObserverReturnType<KeyType, EventType> = {
  subscribe: (entryKey: KeyType, listener: Listener<EventType>) => () => void;
  publish: (entryKey: KeyType, event: EventType) => void;
};

export default function createObserver<
  KeyType extends string | number | symbol,
  EventType,
>(): ObserverReturnType<KeyType, EventType> {
  const listeners: Record<KeyType, Listener<EventType>[]> = {} as Record<
    KeyType,
    Listener<EventType>[]
  >;

  return {
    subscribe: (entryKey: KeyType, listener: Listener<EventType>) => {
      if (!listeners[entryKey]) listeners[entryKey] = [];
      listeners[entryKey].push(listener);
      return () => {
        listeners[entryKey].splice(listeners[entryKey].indexOf(listener), 1);
      };
    },
    publish: (entryKey: KeyType, event: EventType) => {
      if (!listeners[entryKey]) listeners[entryKey] = [];
      listeners[entryKey].forEach((listener: Listener<EventType>) =>
        listener(event),
      );
    },
  };
}

export const LocalStorageObserver = createObserver<string, string>();

export const { subscribe, publish } = LocalStorageObserver;

export function useLocalStorage<T>(key: string, initialValue: T) {

  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item || initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const keyRef = useRef(key);
  if (keyRef.current !== key) {
    keyRef.current = key;
    // force state update
    const storedValue = window.localStorage.getItem(key);
    setStoredValue(storedValue);
  }

  LocalStorageObserver.subscribe(key, setStoredValue);

  const setValue = (value: T) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      LocalStorageObserver.publish(key, valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
}




import Bottleneck from "bottleneck";
import { getAngularService } from "../angular-react-helper";

let nominatimLimiter = new Bottleneck({ maxConcurrent: 2, minTime: 500 });
export const resetNominatimLimiter = () => {
  const newLimiter = new Bottleneck({ maxConcurrent: 2, minTime: 500 });
  nominatimLimiter.stop();
  nominatimLimiter = newLimiter;
};

// accepts a nominatim response object and returns an address-like string
// e.g. "Main St, San Francisco"
function toAddressName(data) {
  const address = data?.["address"];
  if (address) {
    /* Sometimes, the street name ('road') isn't found and is undefined.
      If so, fallback to 'pedestrian' or 'suburb' or 'neighbourhood' */
    const placeName = address['road'] || address['pedestrian'] ||
            address['suburb'] || address['neighbourhood'] || '';
    /* This could be either a city or town. If neither, fallback to 'county' */
    const municipalityName = address['city'] || address['town'] || address['county'] || '';
    return `${placeName}, ${municipalityName}`
  }
  return '...';
}

let nominatimError: Error;
let Logger;
// fetches nominatim data for a given location and stores it using the coordinates as the key
// if the address name is already cached, it skips the fetch
async function fetchNominatimLocName(loc_geojson) {
  Logger = Logger || getAngularService('Logger');
  const coordsStr = loc_geojson.coordinates.toString();
  const cachedResponse = localStorage.getItem(coordsStr);
  if (cachedResponse) {
    console.log('fetchNominatimLocName: found cached response for ', coordsStr, cachedResponse, 'skipping fetch');
    return;
  }
  console.log("Getting location name for ", coordsStr);
  const url = "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + loc_geojson.coordinates[1] + "&lon=" + loc_geojson.coordinates[0];
  try {
    const response = await fetch(url);
    const data = await response.json();
    Logger.log(`while reading data from nominatim, status = ${response.status} data = ${JSON.stringify(data)}`);
    localStorage.setItem(coordsStr, JSON.stringify(data));
    publish(coordsStr, data);
  } catch (error) {
    if (!nominatimError) {
      nominatimError = error;
      Logger.displayError("while reading address data ", error);
    }
  }
};

// Schedules nominatim fetches for the start and end locations of a trip
export function fillLocationNamesOfTrip(trip) {
  nominatimLimiter.schedule(() =>
    fetchNominatimLocName(trip.end_loc));
  nominatimLimiter.schedule(() =>
    fetchNominatimLocName(trip.start_loc));
}

// a React hook that takes a trip or place and returns an array of its address names
export function useAddressNames(tlEntry) {
  const [addressNames, setAddressNames] = useState([]);
  // if a place is passed in, it will need just one address name
  const [locData] = useLocalStorage(tlEntry.location?.coordinates?.toString(), null);
  // if a trip is passed in, it needs two address names (start and end locations)
  const [startLocData] = useLocalStorage(tlEntry.start_loc?.coordinates?.toString(), null);
  const [endLocData] = useLocalStorage(tlEntry.end_loc?.coordinates?.toString(), null);

  useEffect(() => {
    if (locData) {
      setAddressNames([toAddressName(JSON.parse(locData))]);
    } else if (startLocData && endLocData) {
      const startLoc = typeof startLocData === 'string' ? JSON.parse(startLocData) : startLocData;
      const endLoc = typeof endLocData === 'string' ? JSON.parse(endLocData) : endLocData;
      console.debug('useAddressNames: startLocData = ', startLoc, 'endLocData = ', endLoc);
      setAddressNames([toAddressName(startLoc), toAddressName(endLoc)]);
    }
  }, [locData, startLocData, endLocData]);

  return addressNames;
}
