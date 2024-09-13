//this is a custom hook that listens for change in app state
//detects when the app changed to active from inactive (ios) or background (android)
//the executes "onResume" function that is passed in
//https://reactnative.dev/docs/appstate based on react's example of detecting becoming active

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { addStatReading } from './plugin/clientStats';

const useAppStateChange = (onResume) => {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current != 'active' && nextAppState === 'active') {
        onResume();
      }

      appState.current = nextAppState;
      addStatReading('app_state_change', appState.current);
    });
    return () => subscription.remove();
  }, []);

  return {};
};

export default useAppStateChange;
