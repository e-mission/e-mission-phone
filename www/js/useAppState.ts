//this is a custom hook that listens for change in app state
//detects when the app changed to active from inactive (ios) or background (android)
//the executes "onResume" function that is passed in
//https://reactnative.dev/docs/appstate based on react's example of detecting becoming active

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { addStatReading } from './plugin/clientStats';
import { logDebug } from './plugin/logger';

type Props = {
  onNotActive?: () => void;
  onResume?: (msNotActive: number) => void;
  onChange?: (nextAppState: string) => void;
};
const useAppState = ({ onNotActive, onResume, onChange }: Props = {}) => {
  const [appState, setAppState] = useState(AppState.currentState);
  const [lastNonActiveChangeMs, setLastNonActiveChangeMs] = useState<number>(0);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      addStatReading('app_state_change', nextAppState);
      onChange?.(nextAppState);
      if (appState == 'active' && nextAppState != 'active') {
        const now = Date.now();
        setLastNonActiveChangeMs(now);
        logDebug(`App moved from active to ${nextAppState} at ${now}`);
        onNotActive?.();
      }
      if (appState != 'active' && nextAppState == 'active') {
        logDebug(
          `App moved from ${appState} to active after ` +
            `${Date.now() - lastNonActiveChangeMs!} ms not active`,
        );
        onResume?.(Date.now() - lastNonActiveChangeMs!);
      }

      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  return { appState, lastNonActiveChangeMs };
};

export default useAppState;
