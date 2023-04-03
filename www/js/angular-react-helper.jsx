// ---- angular-react-helper.jsx ----
// Source: https://dev.to/kaplona/angularjs-to-react-migration-184g
// Modified to use React 18 and wrap elements with the React Native Paper Provider

import ReactDOM from 'react-dom';
import React from 'react';
import { Provider as PaperProvider, MD3LightTheme as DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0088ce',
    primaryContainer: '#80D0FF',
    secondary: '#0088ce',
    secondaryContainer: '#80D0FF',
  },
};

function toBindings(propTypes) {
  const bindings = {};
  Object.keys(propTypes).forEach(key => bindings[key] = '<');
  return bindings;
}

function toProps(propTypes, controller) {
  const props = {};
  Object.keys(propTypes).forEach(key => props[key] = controller[key]);
  return props;
}

export function angularize(Component) {
  const propTypes = Component.propTypes || {};

  return {
    bindings: toBindings(propTypes),
    controller: /*@ngInject*/ function($element) {
      this.$onChanges = () => {
        const props = toProps(propTypes, this);
        ReactDOM.render(
          <PaperProvider theme={theme}>
            <Component { ...props } />
          </PaperProvider>,
          $element[0]
        );
      };
      this.$onDestroy = () => ReactDOM.unmountComponentAtNode($element[0]);
    }
  };
}

export function getAngularService(name) {
  const injector = angular.element(document.body).injector();
  if (!injector || !injector.get) {
    throw new Error(`Couldn't find angular injector to get "${name}" service`);
  }

  const service = injector.get(name);
  if (!service) {
    throw new Error(`Couldn't find "${name}" angular service`);
  }

  return service;
}
