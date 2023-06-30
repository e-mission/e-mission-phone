import React from 'react';
import { FlashList } from '@shopify/flash-list';
import { array, func, object, oneOfType, bool, string } from 'prop-types';
import TripCard from '../cards/TripCard';
import PlaceCard from '../cards/PlaceCard';
import UntrackedTimeCard from '../cards/UntrackedTimeCard';
import { View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import LoadMoreButton from './LoadMoreButton';

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

  // The way that FlashList inverts the scroll view means we have to reverse the order of items too
  const reversedListEntries = listEntries ? [...listEntries].reverse() : [];

  const reachedPipelineStart = (queriedRange?.start_ts <= pipelineRange?.start_ts);
  const footer =  <LoadMoreButton onPressFn={() => loadMoreFn('past')}
                                  disabled={reachedPipelineStart}>
                      { reachedPipelineStart ? "No more travel" : "Show Older Travel"}
                  </LoadMoreButton>;
  
  const reachedPipelineEnd = (queriedRange?.end_ts >= pipelineRange?.end_ts);
  const header =  <LoadMoreButton onPressFn={() => loadMoreFn('future')}
                                  disabled={reachedPipelineEnd}>
                      { reachedPipelineEnd ? "No more travel" : "Show More Travel"}
                  </LoadMoreButton>;

  if (isLoading=='replace') {
    return bigSpinner;
  } else if (listEntries?.length == 0) {
    return "No travel to show";
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
