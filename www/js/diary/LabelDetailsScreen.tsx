/* A screen to show details of a trip, including a recap of trip info, a full-size map,
    listed sections of the trip, and a graph of speed during the trip.
  Navigated to from the main LabelListScreen by clicking a trip card. */

import React, { useContext } from "react";
import { View, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Appbar, Divider, Surface, Text, useTheme } from "react-native-paper";
import { LabelTabContext } from "./LabelTab";
import { cardStyles } from "./cards/DiaryCard";
import LeafletView from "../components/LeafletView";
import { useTranslation } from "react-i18next";
import MultilabelButtonGroup from "../survey/multilabel/MultiLabelButtonGroup";
import UserInputButton from "../survey/enketo/UserInputButton";
import { getAngularService } from "../angular-react-helper";
import { useImperialConfig } from "../config/useImperialConfig";
import { useAddressNames } from "./addressNamesHelper";
import { Icon } from "../components/Icon";

const LabelScreenDetails = ({ route, navigation }) => {

  const { surveyOpt, timelineMap } = useContext(LabelTabContext);
  const { getFormattedDistance, distanceSuffix } = useImperialConfig();
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const { colors } = useTheme();
  const { tripId } = route.params;
  const trip = timelineMap.get(tripId);
  const [ tripStartDisplayName, tripEndDisplayName ] = useAddressNames(trip);
  const mapOpts = {minZoom: 3, maxZoom: 17};

  const DiaryHelper = getAngularService('DiaryHelper');
  const sectionsFormatted = DiaryHelper.getFormattedSectionProperties(trip, {getFormattedDistance, distanceSuffix});
  
  return (<>
      <Appbar.Header statusBarHeight={12} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
        <Appbar.BackAction onPress={() => { navigation.goBack() }} />
        <Appbar.Content title={trip.display_date} />
      </Appbar.Header>
      <Surface mode='elevated' style={{ paddingVertical: 4, paddingHorizontal: 10, zIndex: 1 }}>
        <View style={[cardStyles.location, { justifyContent: 'flex-start' }]}>
          <Text style={{padding: 10}}>
            {trip.display_start_time}
          </Text>
            <Icon icon='map-marker-star' color={colors.primaryContainer} size={18}
              style={cardStyles.locationIcon} />
            <Text numberOfLines={2}>
              {tripStartDisplayName}
            </Text>
        </View>
        <Divider style={{ marginVertical: 4 }} />
        <View style={[cardStyles.location, { justifyContent: 'flex-start' }]}>
          <Text style={{padding: 10}}>
            {trip.display_end_time}
          </Text>
            <Icon icon='flag' color={colors.primary} size={18}
              style={cardStyles.locationIcon} />
            <Text numberOfLines={2}>
              {tripEndDisplayName}
            </Text>
        </View>
      </Surface>
      <ScrollView style={{ paddingBottom: 30}}>
        <Surface mode='flat' style={{padding: 10, marginHorizontal: 10, marginVertical: 18 }}>
          <LeafletView geojson={trip.geojson} style={{width: '100%', height: windowHeight/2, marginBottom: 10}} opts={mapOpts} />
          <View style={{flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginVertical: 5}}>
            <View style={{justifyContent: 'center'}}>
              <Text style={{fontSize: 15}}>
                {t('diary.distance')}
              </Text>
              <Text style={{fontSize: 13, fontWeight: 'bold'}}>
                {`${getFormattedDistance(trip.distance)} ${distanceSuffix}`}
              </Text>
            </View>
            <View style={{justifyContent: 'center'}}>
              <Text style={{fontSize: 15}}>
                {t('diary.time')}
              </Text>
              <Text style={{fontSize: 13, fontWeight: 'bold'}}>
                {trip.display_time}
              </Text>
            </View>
            <View style={{justifyContent: 'center'}}>
              {trip.percentages?.map?.((pct, i) => (
                <View key={i} style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Icon icon={pct.icon} size={16} color={pct.color} />
                  <Text style={{fontSize: 13, fontWeight: 'bold'}}>
                    {pct.pct}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View style={{marginVertical: 10, paddingHorizontal: '10%'}}>
            {surveyOpt?.elementTag == 'multilabel' &&
                <MultilabelButtonGroup trip={trip} />}
            {surveyOpt?.elementTag == 'enketo-trip-button'
                && <UserInputButton timelineEntry={trip} />}
          </View>
          {/* for multi-section trips, show a list of sections */}
          {sectionsFormatted?.length > 1 &&
            <View style={{marginTop: 15}}>
              {sectionsFormatted.map((section, i) => (
                <View key={i} style={{marginVertical: 4, marginHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <View>
                    <Text style={{fontSize: 15}}> {section.fmt_time_range} </Text>
                    <Text style={{fontSize: 13}}> {section.fmt_time} </Text>
                  </View>
                  <View>
                    <Text style={{fontSize: 20}}>
                      {`${section.fmt_distance} ${section.fmt_distance_suffix}`}
                    </Text>
                  </View>
                  <View>
                    <Icon mode='contained' icon={section.icon}
                      size={18} style={{height: 32, width: 32}}
                      iconColor={colors.onPrimary} containerColor={section.color} />
                  </View>
                </View>
              ))}
            </View>
          }

          {/* TODO: show speed graph here */}

        </Surface>
      </ScrollView>
  </>)
}

export default LabelScreenDetails;
