import { MD3LightTheme as DefaultTheme, MD3Theme } from 'react-native-paper';

/* This is the base theme we will use throughout the app
  It's based on the default theme from React Native Paper, with some modifications */

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0080b9', // lch(50% 50 250)
    primaryContainer: '#90ceff', // lch(80% 40 250)
    onPrimaryContainer: '#001e30', // lch(10% 50 250)
    secondary: '#f2795c', // lch(65% 60 40)
    secondaryContainer: '#ffb39e', // lch(80% 45 40)
    background: '#edf1f6', // lch(95% 3 250) - background of label screen, other screens still have this as CSS .pane
    surface: '#fafdff', // lch(99% 30 250)
    surfaceVariant: '#e0f0ff', // lch(94% 50 250) - background of DataTable
    elevation: {
      level0: 'transparent',
      level1: '#fafdff', // lch(99% 30 250)
      level2: '#f2f9ff', // lch(97.5% 50 250)
      level3: '#ebf5ff', // lch(96% 50 250)
      level4: '#e0f0ff', // lch(94% 50 250)
      level5: '#d6ebff', // lch(92% 50 250)
    },
  },
  roundness: 5,
};

/* Next, we'll set up 'flavors' of the theme, which are variations on the theme
    with any number of properties overridden.
  This is used to automatically style the different types of diary cards
    (trip / place / untracked / draft trip) without having to hard-code the colors
    in each card component.
  It could totally be useful in other instances too - anywhere we want to have a
    more dynamic approach to styling. */

// We want to be able to override only *some* of the theme properties
// This tells TypeScript that all properties are optional, including nested ones
type DPartial<T> = { [P in keyof T]?: DPartial<T[P]> }; // https://stackoverflow.com/a/61132308
type PartialTheme = DPartial<MD3Theme>;

const flavorOverrides = {
  place: { // for PlaceCards; a blueish color scheme
    colors: {
      elevation: {
        level1: '#cbe6ff', // lch(90, 20, 250)
      },
    }
  },
  untracked: { // for UntrackedTimeCards; a reddish color scheme
    colors: {
      primary: '#8c4a57', // lch(40 30 10)
      primaryContainer: '#e3bdc2', // lch(80 15 10)
      elevation: {
        level1: '#f8ebec', // lch(94 5 10)
      },
    }
  },
  draft: { // for draft TripCards; a greenish color scheme
    colors: {
      primary: '#637d6a', // lch(50 15 150)
      primaryContainer: '#b8cbbd', // lch(80 10 150)
      elevation: {
        level1: '#e1e3e1', // lch(90 1 150)
        level2: '#d7dbd8', // lch(87 2 150)
      },
    }
  },
} satisfies Record<string, PartialTheme>;

/* This function is used to retrieve the theme for a given flavor.
  If no valid flavor is specified, it returns the default theme. */
export const getTheme = (flavor?: keyof typeof flavorOverrides) => {
  if (!flavorOverrides[flavor]) return AppTheme;
  const typeStyle = flavorOverrides[flavor];
  const scopedElevation = {...AppTheme.colors.elevation, ...typeStyle?.colors?.elevation};
  const scopedColors = {...AppTheme.colors, ...{...typeStyle.colors, elevation: scopedElevation}};
  return {...AppTheme, colors: scopedColors};
}
