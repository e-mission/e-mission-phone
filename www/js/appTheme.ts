import { MD3LightTheme as DefaultTheme, MD3Theme } from 'react-native-paper';

/* This is the base theme we will use throughout the app
  It's based on the default theme from React Native Paper, with some modifications */

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0080b9', // lch(50% 50 250)
    primaryContainer: '#c0e2ff', // lch(88% 30 250)
    onPrimaryContainer: '#001e30', // lch(10% 50 250)
    secondary: '#c08331', // lch(60% 55 70)
    secondaryContainer: '#fcefda', // lch(95% 12 80)
    onSecondaryContainer: '#45392e', // lch(25% 10 65)
    background: '#edf1f6', // lch(95% 3 250) - background of label screen, other screens still have this as CSS .pane
    surface: '#fafdff', // lch(99% 30 250)
    surfaceVariant: '#e0f0ff', // lch(94% 50 250) - background of DataTable
    surfaceDisabled: '#c7e0f7', // lch(88% 15 250)
    onSurfaceDisabled: '#3a4955', // lch(30% 10 250)
    elevation: {
      level0: 'transparent',
      level1: '#fafdff', // lch(99% 30 250)
      level2: '#f2f9ff', // lch(97.5% 50 250)
      level3: '#ebf5ff', // lch(96% 50 250)
      level4: '#e0f0ff', // lch(94% 50 250)
      level5: '#d6ebff', // lch(92% 50 250)
    },
    success: '#00a665', // lch(60% 55 155)
    warn: '#f8cf53', //lch(85% 65 85)
    danger: '#f23934' // lch(55% 85 35)
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
  draft: { // for TripCards and LabelDetailsScreen of draft trips; a greyish color scheme
    colors: {
      primary: '#616971', // lch(44 6 250)
      primaryContainer: '#b6bcc2', // lch(76 4 250)
      background: '#eef1f4', // lch(95 2 250)
      surface: '#eef1f4', // lch(95 2 250)
      surfaceDisabled: '#c7cacd', // lch(81 2 250)
      elevation: {
        level1: '#e1e3e4', // lch(90 1 250)
        level2: '#d2d5d8', // lch(85 2 250)
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
