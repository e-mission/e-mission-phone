/* React Native Paper provides an IconButton component, but it doesn't provide a plain Icon.
  We want a plain Icon that is 'presentational' - not seen as interactive to the user or screen readers, and
  it should not have any extra padding or margins around it. */
/* Using the underlying Icon from React Native Paper doesn't bundle correctly, so the easiest thing to do
  for now is wrap an IconButton and remove its interactivity and padding. */

import React from 'react';
import { StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Props } from 'react-native-paper/lib/typescript/src/components/IconButton/IconButton'

export const Icon = (props: Props) => {
  return (
    <IconButton icon={props.icon} iconColor={props.iconColor}
      size={props.size} style={[s.icon, props.style]}
      role='none' focusable={false} accessibilityHidden={true} />
  );
}

const s = StyleSheet.create({
  icon: {
    width: 'unset',
    height: 'unset',
    padding: 0,
    margin: 0,
  },
});
