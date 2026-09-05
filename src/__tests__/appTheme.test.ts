import { getTheme } from '../js/appTheme';

describe('getTheme', () => {
  it('should return the right theme with place', () => {
    const theme = getTheme('place');
    expect(theme.colors.elevation.level1).toEqual('#cbe6ff');
  });

  it('should return the right theme with untracked', () => {
    const theme = getTheme('untracked');
    expect(theme.colors.primary).toEqual('#8c4a57');
    expect(theme.colors.primaryContainer).toEqual('#e3bdc2');
    expect(theme.colors.elevation.level1).toEqual('#f8ebec');
  });

  it('should return the right theme with draft', () => {
    const theme = getTheme('draft');
    expect(theme.colors.primary).toEqual('#616971');
    expect(theme.colors.primaryContainer).toEqual('#b6bcc2');
    expect(theme.colors.background).toEqual('#eef1f4');
  });
});
