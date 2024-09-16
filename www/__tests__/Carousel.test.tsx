import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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

  it('scrolls correctly to the next card', () => {
    const { getByTestId } = render(
      <Carousel cardWidth={cardWidth} cardMargin={cardMargin}>
        {child1}
        {child2}
      </Carousel>,
    );

    const scrollView = getByTestId('carousel');
    fireEvent.scroll(scrollView, {
      // Scroll to the second card
      nativeEvent: {
        contentOffset: {
          x: cardWidth + cardMargin,
        },
        contentSize: {
          width: (cardWidth + cardMargin) * 2,
        },
        layoutMeasurement: {
          width: cardWidth + cardMargin,
        },
      },
    });

    expect(scrollView.props.horizontal).toBe(true);
    expect(scrollView.props.snapToInterval).toBe(cardWidth + cardMargin);
  });
});
