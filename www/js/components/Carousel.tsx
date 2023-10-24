import React from 'react';
import { ScrollView, View } from 'react-native';

type Props = {
  children: React.ReactNode,
  cardWidth: number,
  cardMargin: number,
}
const Carousel = ({ children, cardWidth, cardMargin }: Props) => {
  const numCards = React.Children.count(children);
  return (
    <ScrollView horizontal={true}
      decelerationRate={0}
      snapToInterval={cardWidth + cardMargin}
      snapToAlignment={"center"}
      style={s.carouselScroll(cardMargin)}
      contentContainerStyle={{alignItems: 'flex-start'}}>
      {React.Children.map(children, (child, i) => (
        <View style={s.carouselCard(cardWidth, cardMargin, (i == 0), (i == numCards-1))}>
          {child}
        </View>
      ))}
    </ScrollView>
  )
};

export const s = {
  carouselScroll: (cardMargin) => ({
    // @ts-ignore, RN doesn't recognize `scrollSnapType`, but it does work on RN Web
    scrollSnapType: 'x mandatory',
    paddingVertical: 10,
  }),
  carouselCard: (cardWidth, cardMargin, isFirst, isLast) => ({
    marginLeft: isFirst ? cardMargin : cardMargin/2,
    marginRight: isLast ? cardMargin : cardMargin/2,
    width: cardWidth,
    scrollSnapAlign: 'center',
    scrollSnapStop: 'always',
  }),
};

export default Carousel;
