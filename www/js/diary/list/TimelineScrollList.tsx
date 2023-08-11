import React from 'react';
import { FlashList } from '@shopify/flash-list';
import { array, func, object, oneOfType, bool, string } from 'prop-types';
import TripCard from '../cards/TripCard';
import PlaceCard from '../cards/PlaceCard';
import UntrackedTimeCard from '../cards/UntrackedTimeCard';
import { View } from 'react-native';
import { ActivityIndicator, Banner, Text } from 'react-native-paper';
import LoadMoreButton from './LoadMoreButton';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icon';

const renderCard = ({ item: listEntry }) => {
  if (listEntry.origin_key.includes('trip')) {
    return <TripCard trip={listEntry} />
  } else if (listEntry.origin_key.includes('place')) {
    return <PlaceCard place={listEntry} />
  } else if (listEntry.origin_key.includes('untracked')) {
    return <UntrackedTimeCard triplike={listEntry} />
  }
};

const separator = () => <View style={{ height: 8 }} />
const bigSpinner = <ActivityIndicator size="large" style={{margin: 15}} />
const smallSpinner = <ActivityIndicator size="small" style={{margin: 5}} />

const TimelineScrollList = ({ listEntries, queriedRange, pipelineRange, loadMoreFn, isLoading }) => {

  const { t } = useTranslation();

  // The way that FlashList inverts the scroll view means we have to reverse the order of items too
  const reversedListEntries = listEntries ? [...listEntries].reverse() : [];

  const reachedPipelineStart = (queriedRange?.start_ts <= pipelineRange?.start_ts);
  const footer =  <LoadMoreButton onPressFn={() => loadMoreFn('past')}
                                  disabled={reachedPipelineStart}>
                      { reachedPipelineStart ? t('diary.no-more-travel') : t('diary.show-older-travel')}
                  </LoadMoreButton>;
  
  const reachedPipelineEnd = (queriedRange?.end_ts >= pipelineRange?.end_ts);
  const header =  <LoadMoreButton onPressFn={() => loadMoreFn('future')}
                                  disabled={reachedPipelineEnd}>
                      { reachedPipelineEnd ? t('diary.no-more-travel') : t('diary.show-more-travel')}
                  </LoadMoreButton>;

  const noTravelBanner = (
    <Banner visible={true} icon={
      ({ size }) => <Icon size={size} icon='alert-circle' style={{ marginVertical: 3 }} />
    }>
      <View style={{ width: '100%' }}>
        <Text variant='titleMedium'>{t('diary.no-travel')}</Text>
        <Text variant='bodySmall'>{t('diary.no-travel-hint')}</Text>
      </View>
    </Banner>
  );

  if (pipelineRange && !pipelineRange.end_ts && !listEntries?.length) {
    /* Condition: pipelineRange has been fetched but has no defined end, meaning nothing has been
      processed for this OPCode yet, and there are no unprocessed trips either. Show 'no travel'. */
    return noTravelBanner;
  } else if (isLoading=='replace') {
    /* Condition: we're loading an entirely new batch of trips, so show a big spinner */
    return bigSpinner;
  } else if (listEntries && listEntries.length == 0) {
    /* Condition: we've loaded all travel and set `listEntries`, but it's empty. Show 'no travel'. */
    return noTravelBanner;
  } else {
    return (
      <FlashList inverted
        data={reversedListEntries}
        renderItem={renderCard}
        estimatedItemSize={240}
        keyExtractor={(item) => item._id.$oid}
        /* TODO: We can capture onScroll events like this, so we should be able to automatically
            load more trips when the user is approaching the bottom or top of the list.
            This might be a nicer experience than the current header and footer buttons. */
        // onScroll={e => console.debug(e.nativeEvent.contentOffset.y)}
        ListHeaderComponent={isLoading == 'append' ? smallSpinner : (!reachedPipelineEnd && header)}
        ListFooterComponent={isLoading == 'prepend' ? smallSpinner : footer}
        ItemSeparatorComponent={separator} />
    );
  }
}

TimelineScrollList.propTypes = {
  listEntries: array,
  queriedRange: object,
  pipelineRange: object,
  loadMoreFn: func,
  isLoading: oneOfType([bool, string])
};

export default TimelineScrollList;
