/*
  Enables "dynamic" styles in StyleSheet.create.
  Explanation: https://github.com/e-mission/e-mission-phone/pull/1106/files#r1475128446
*/

import 'react-native';
import { TextStyle, ViewStyle, ImageStyle } from 'react-native';

type Style = ViewStyle | TextStyle | ImageStyle;

declare module 'react-native' {
  namespace StyleSheet {
    type NamedDynamicStyles<T> = { [P in keyof T]: Style | ((...args: any[]) => Style) };
    export function create<T extends NamedDynamicStyles<T> | NamedDynamicStyles<any>>(
      styles: T | NamedDynamicStyles<T>,
    ): T;
  }
}
