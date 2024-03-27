// based on https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

import React from 'react';
import { displayError } from './logger';
import { View } from 'react-native';
import { Icon } from 'react-native-paper';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    displayError(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Icon source="alpha-x-box-outline" size={50} />
        </View>
      );
    }

    return this.props.children;
  }
}

export const withErrorBoundary = (Component) => (props) => (
  <ErrorBoundary>
    <Component {...props} />
  </ErrorBoundary>
);

export default ErrorBoundary;
