//this is a custom hook that listens for change in app state
//detects when the app changed to active from inactive (ios) or background (android)
//the executes "onResume" function that is passed in
//https://reactnative.dev/docs/appstate based on react's example of detecting becoming active

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

const useAppStateChange = (onResume) => {

    const appState = useRef(AppState.currentState);
  
    useEffect(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
        if ( appState.current != 'active' && nextAppState === 'active') {
          onResume();
        }
  
        appState.current = nextAppState;
        console.log('AppState', appState.current);
      });
  
    }, []);
  
    return {};
  }
  
  export default useAppStateChange;
  