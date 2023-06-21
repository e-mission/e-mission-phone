// ---- angular-react-helper.jsx ----
// Adapted from https://dev.to/kaplona/angularjs-to-react-migration-184g
// Modified to use React 18 and wrap elements with the React Native Paper Provider

import angular from 'angular';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { Provider as PaperProvider, MD3LightTheme as DefaultTheme, MD3Colors } from 'react-native-paper';
import { getTheme } from './appTheme';

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

export function angularize(component, name, modulePath) {
  component.module = modulePath;
  const nameCamelCase = name[0].toLowerCase() + name.slice(1);
  angular
    .module(modulePath, [])
    .component(nameCamelCase, makeComponentProps(component));
}

const theme = getTheme();
export function makeComponentProps(Component) {
  const propTypes = Component.propTypes || {};
  return {
    bindings: toBindings(propTypes),
    controller: function($element) {
      /* TODO: once the inf scroll list is converted to React and no longer uses
        collection-repeat, we can just set the root here one time
        and will not have to reassign it in $onChanges. */
      /* Until then, React will complain everytime we reassign an element's root */
      let root;
      this.$onChanges = () => {
        root = createRoot($element[0]);
        const props = toProps(propTypes, this);
        root.render(
          <PaperProvider theme={theme}>
            <style type="text/css">{`
              @font-face {
                font-family: 'MaterialCommunityIcons';
                src: url(${require('react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf')}) format('truetype');
              }`}
            </style>
            <Component { ...props } />
          </PaperProvider>
        );
      };
      this.$onDestroy = () => root.unmount();
    }
  };
}

export function getAngularService(name: string) {
  const injector = angular.element(document.body).injector();
  if (!injector || !injector.get) {
    throw new Error(`Couldn't find angular injector to get "${name}" service`);
  }

  const service = injector.get(name);
  if (!service) {
    throw new Error(`Couldn't find "${name}" angular service`);
  }

  return (service as any); // casting to 'any' because not all Angular services are typed
}

export function createScopeWithVars(vars) {
  const scope = getAngularService("$rootScope").$new();
  Object.assign(scope, vars);
  return scope;
}
