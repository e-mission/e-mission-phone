import React from 'react';
import { ScrollView, View } from 'react-native';

type Props = {
  children: React.ReactNode,
  cardWidth: number,
  cardMargin: number,
}
const Carousel = ({ children, cardWidth, cardMargin }: Props) => {
  return (
    <ScrollView horizontal={true}
      decelerationRate={0}
      snapToInterval={cardWidth + cardMargin*2}
      snapToAlignment={"center"}
      style={s.carouselScroll}
      contentContainerStyle={{alignItems: 'flex-start'}}>
      {React.Children.map(children, child => (
        <View style={s.carouselCard(cardWidth, cardMargin)}>
          {child}
        </View>
      ))}
    </ScrollView>
  )
};

export const s = {
  carouselScroll: {
    // @ts-ignore, RN doesn't recognize `scrollSnapType`, but it does work on RN Web
    scrollSnapType: 'x mandatory',
    paddingVertical: 10,
  },
  carouselCard: (cardWidth, cardMargin) => ({
    margin: cardMargin,
    width: cardWidth,
    scrollSnapAlign: 'center',
    scrollSnapStop: 'always',
  }),
};

export default Carousel;
