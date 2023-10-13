// ---- angular-react-helper.jsx ----
// Adapted from https://dev.to/kaplona/angularjs-to-react-migration-184g
// Modified to use React 18 and wrap elements with the React Native Paper Provider

import angular from 'angular';

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
