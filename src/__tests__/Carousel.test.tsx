import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import Carousel from '../js/components/Carousel';

describe('Carousel component', () => {
  const child1 = <View testID="child1">Child 1</View>;
  const child2 = <View testID="child2">Child 2</View>;
  const cardWidth = 100;
  const cardMargin = 10;

  it('renders children correctly', () => {
    const { getByTestId } = render(
      <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
        {child1}
        {child2}
      </Carousel>,
    );

    const renderedChild1 = getByTestId('child1');
    const renderedChild2 = getByTestId('child2');

    expect(renderedChild1).toBeTruthy();
    expect(renderedChild2).toBeTruthy();
  });
});
