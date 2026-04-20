import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import Carousel from '../js/components/Carousel';

describe('Carousel component', () => {
  const child1 = (
    <View testID="child1">
      <Text>Child 1</Text>
    </View>
  );
  const child2 = (
    <View testID="child2">
      <Text>Child 2</Text>
    </View>
  );
  const cardWidth = 100;
  const cardMargin = 10;

  it('renders children correctly', () => {
    const { toJSON } = render(
      <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
        {child1}
        {child2}
      </Carousel>,
    );

    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('Child 1');
    expect(tree).toContain('Child 2');
  });
});
