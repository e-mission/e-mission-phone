//this is a custom hook that listens for change in app state
//detects when the app changed to active from inactive (ios) or background (android)
//the executes "onResume" function that is passed in
//https://reactnative.dev/docs/appstate based on react's example of detecting becoming active

import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { addStatReading } from './plugin/clientStats';

type Props = {
  onResume?: () => void;
  onChange?: (nextAppState: string) => void;
};
const useAppState = ({ onResume, onChange }: Props) => {
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      addStatReading('app_state_change', nextAppState);
      onChange?.(nextAppState);
      if (nextAppState == 'active' && appState != 'active') {
        onResume?.();
      }
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  return appState;
};

export default useAppState;
