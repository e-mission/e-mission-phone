//this is a custom hook that listens for change in app state
//detects when the app changed to active from inactive (ios) or background (android)
//the executes "onResume" function that is passed in
//https://reactnative.dev/docs/appstate based on react's example of detecting becoming active

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { addStatReading } from './plugin/clientStats';
import { logDebug } from './plugin/logger';

type Props = {
  onActive?: (msNotActive: number) => void;
  onNotActive?: (msActive: number) => void;
  onChange?: (nextAppState: string) => void;
};
const useAppState = ({ onNotActive, onActive, onChange }: Props = {}) => {
  const [appState, setAppState] = useState(AppState.currentState);
  const [lastActiveMs, setLastActiveMs] = useState<number>(0);
  const [lastNotActiveMs, setLastNotActiveMs] = useState<number>(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      addStatReading('app_state_change', nextAppState);
      const now = Date.now();
      logDebug(`AppState: ${nextAppState} at ${now}`);
      if (nextAppState == 'active') {
        setLastActiveMs(now);
      } else {
        setLastNotActiveMs(now);
      }
      onChange?.(nextAppState);
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const msNotActive = lastActiveMs - lastNotActiveMs;
    logDebug(`AppState: active after ${msNotActive} ms not active`);
    onActive?.(msNotActive);
  }, [lastActiveMs]);

  useEffect(() => {
    const msActive = lastNotActiveMs - lastActiveMs;
    logDebug(`AppState: not active after ${msActive} ms active`);
    onNotActive?.(msActive);
  }, [lastNotActiveMs]);

  return { appState, lastActiveMs, lastNotActiveMs };
};

export default useAppState;
