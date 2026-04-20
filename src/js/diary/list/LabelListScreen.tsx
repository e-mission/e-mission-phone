import React, { useContext, useEffect } from 'react';
import { View } from 'react-native';
import { Appbar, useTheme } from 'react-native-paper';
import DateSelect from './DateSelect';
import FilterSelect from './FilterSelect';
import TimelineScrollList from './TimelineScrollList';
import NavBar from '../../components/NavBar';
import TimelineContext from '../../TimelineContext';
import { LabelTabContext } from '../LabelTab';
import { DateTime } from 'luxon';
import { displayErrorMsg } from '../../plugin/logger';
import { Alerts } from '../../components/AlertArea';
import FeedbackModal from '../../control/FeedbackModal';
import { AppContext } from '../../App';
import { isTrip } from '../../types/diaryTypes';
import { tripIsUnlabeled as multilabelTripIsUnlabeled } from '../../survey/multilabel/infinite_scroll_filters';
import { tripIsUnlabeled as enketoTripIsUnlabeled } from '../../survey/enketo/infinite_scroll_filters';

const LabelListScreen = () => {
  const { appConfig, onboardingState, userProfile } = useContext(AppContext);
  const { filterInputs, setFilterInputs, displayedEntries } = useContext(LabelTabContext);
  const {
    timelineMap,
    timelineLabelMap,
    loadDateRange,
    timelineIsLoading,
    refreshTimeline,
    shouldUpdateTimeline,
  } = useContext(TimelineContext);
  const { colors } = useTheme();

  // One time only: when the user finishes labeling all their trips
  // and they have previously labeled at least 50 trips,
  // we trigger the FeedbackModal
  useEffect(() => {
    // for now, this is for test users only
    if (!onboardingState?.opcode.includes('_test_')) {
      return;
    }

    const tripIsUnlabeled =
      appConfig?.survey_info?.['trip-labels'] == 'ENKETO'
        ? enketoTripIsUnlabeled
        : multilabelTripIsUnlabeled;

    if (
      // we haven't already shown the modal
      !localStorage.getItem('FEEDBACK_MODAL_SHOWN') &&
      // and the user already has at least 50 processed labeled trips
      userProfile?.labeled_trips &&
      userProfile.labeled_trips >= 50 &&
      // and there are some trips being displayed
      displayedEntries?.some((e) => isTrip(e)) &&
      // and none of the displayed trips are unlabeled
      // (i.e. the last trip onscreen just got labeled)
      timelineLabelMap &&
      !displayedEntries?.some(
        (e) => isTrip(e) && tripIsUnlabeled(e, timelineLabelMap?.[e._id.$oid]),
      )
    ) {
      localStorage.setItem('FEEDBACK_MODAL_SHOWN', 'true');
      setTimeout(() => Alerts.showPopup(FeedbackModal), 500);
    }
  }, [onboardingState, userProfile, timelineMap, timelineLabelMap, displayedEntries]);

  return (
    <>
      <NavBar elevated={true} isLoading={Boolean(timelineIsLoading)}>
        <FilterSelect
          filters={filterInputs}
          setFilters={setFilterInputs}
          numListDisplayed={displayedEntries?.length}
          numListTotal={timelineMap?.size}
        />
        <DateSelect
          mode="range"
          onChoose={({ startDate, endDate }) => {
            const start = DateTime.fromJSDate(startDate).toISODate();
            const end = DateTime.fromJSDate(endDate).toISODate();
            if (!start || !end) return displayErrorMsg('Invalid date');
            loadDateRange([start, end]);
          }}
        />
        <Appbar.Action
          icon="refresh"
          size={32}
          onPress={() => refreshTimeline()}
          accessibilityLabel="Refresh"
          style={{ margin: 0, marginLeft: 'auto' }}
        />
      </NavBar>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {shouldUpdateTimeline && <TimelineScrollList listEntries={displayedEntries} />}
      </View>
    </>
  );
};

export default LabelListScreen;
