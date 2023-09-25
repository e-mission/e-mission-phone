import React, { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import { Dialog, Button, Switch, Text, useTheme } from 'react-native-paper';
import { useTranslation } from "react-i18next";
import { settingStyles } from "./ProfileSettings";
import { getAngularService } from "../angular-react-helper";
import ActionMenu from "../components/ActionMenu";
import SettingRow from "./SettingRow";
import AlertBar from "./AlertBar";
import moment from "moment";

/*
* BEGIN: Simple read/write wrappers
*/
export function forcePluginSync() {
    return window.cordova.plugins.BEMServerSync.forceSync();
};  

const formatConfigForDisplay = (configToFormat) => {
    var formatted = [];
    for (let prop in configToFormat) {
        formatted.push({'key': prop, 'val': configToFormat[prop]});
    }
    return formatted;
}

const setConfig = function(config) {
    return window.cordova.plugins.BEMServerSync.setConfig(config);
    };

const getConfig = function() {
    return window.cordova.plugins.BEMServerSync.getConfig();
};

export async function getHelperSyncSettings() {
    let tempConfig = await getConfig();
    return formatConfigForDisplay(tempConfig);
}

const getEndTransitionKey = function() {
    if(window.cordova.platformId == 'android') {
        return "local.transition.stopped_moving";
    }
    else if(window.cordova.platformId == 'ios') {
        return "T_TRIP_ENDED";
    }
}

type syncConfig = { sync_interval: number, 
                    ios_use_remote_push: boolean };

//forceSync and endForceSync SettingRows & their actions
export const ForceSyncRow = ({getState}) => {
    const { t } = useTranslation(); 
    const { colors } = useTheme();
    const ClientStats = getAngularService('ClientStats');
    const Logger = getAngularService('Logger');

    const [dataPendingVis, setDataPendingVis] = useState(false);
    const [dataPushedVis, setDataPushedVis] = useState(false);

    async function forceSync() {
        try {
            let addedEvent = ClientStats.addEvent(ClientStats.getStatKeys().BUTTON_FORCE_SYNC);
            console.log("Added "+ClientStats.getStatKeys().BUTTON_FORCE_SYNC+" event");

            let sync = await forcePluginSync();
            /*
            * Change to sensorKey to "background/location" after fixing issues
            * with getLastSensorData and getLastMessages in the usercache
            * See https://github.com/e-mission/e-mission-phone/issues/279 for details
            */
            var sensorKey = "statemachine/transition";
            let sensorDataList = await window.cordova.plugins.BEMUserCache.getAllMessages(sensorKey, true);
            
            // If everything has been pushed, we should
            // have no more trip end transitions left
            let isTripEnd = function(entry) {
                return entry.metadata == getEndTransitionKey();
            }
            let syncLaunchedCalls = sensorDataList.filter(isTripEnd);
            let syncPending = syncLaunchedCalls.length > 0;
            Logger.log("sensorDataList.length = "+sensorDataList.length+
                        ", syncLaunchedCalls.length = "+syncLaunchedCalls.length+
                        ", syncPending? = "+syncPending);
            Logger.log("sync launched = "+syncPending);
            
            if(syncPending) {
                Logger.log(Logger.log("data is pending, showing confirm dialog"));
                        setDataPendingVis(true); //consent handling in modal
            } else {
                setDataPushedVis(true);
            }
        } catch (error) {
            Logger.displayError("Error while forcing sync", error);
        }
    };

    const getStartTransitionKey = function() {
        if(window.cordova.platformId == 'android') {
            return "local.transition.exited_geofence";
        }
        else if(window.cordova.platformId == 'ios') {
            return "T_EXITED_GEOFENCE";
        }
    }

    const getEndTransitionKey = function() {
        if(window.cordova.platformId == 'android') {
            return "local.transition.stopped_moving";
        }
        else if(window.cordova.platformId == 'ios') {
            return "T_TRIP_ENDED";
        }
    }

    const getOngoingTransitionState = function() {
        if(window.cordova.platformId == 'android') {
            return "local.state.ongoing_trip";
        }
        else if(window.cordova.platformId == 'ios') {
            return "STATE_ONGOING_TRIP";
        }
    }

    async function getTransition(transKey) {
        var entry_data = {};
        const curr_state = await getState();
        entry_data.curr_state = curr_state;
        if (transKey == getEndTransitionKey()) {
            entry_data.curr_state = getOngoingTransitionState();
        }
        entry_data.transition = transKey;
        entry_data.ts = moment().unix();
        return entry_data;
    }

    async function endForceSync() {
        /* First, quickly start and end the trip. Let's listen to the promise
         * result for start so that we ensure ordering */
        var sensorKey = "statemachine/transition";
        let entry_data = await getTransition(getStartTransitionKey());
        let messagePut = await window.cordova.plugins.BEMUserCache.putMessage(sensorKey, entry_data);
        entry_data = await getTransition(getEndTransitionKey());
        messagePut = await window.cordova.plugins.BEMUserCache.putMessage(sensorKey, entry_data);
        forceSync();
    };

    return (
        <>
            <SettingRow textKey="control.force-sync" iconName="sync" action={forceSync}></SettingRow>
            <SettingRow textKey="control.end-trip-sync" iconName="sync-alert" action={endForceSync}></SettingRow>

            {/* dataPending */}
            <Modal visible={dataPendingVis} onDismiss={()=>setDataPendingVis(false)} transparent={true}>
                <Dialog visible={dataPendingVis} 
                        onDismiss={()=>setDataPendingVis(false)} 
                        style={settingStyles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>{t('data pending for push')}</Dialog.Title>
                    <Dialog.Actions>
                        <Button onPress={()=>{
                            setDataPendingVis(false);
                            Logger.log("user refused to re-sync")}}>
                                {t('general-settings.cancel')}
                        </Button>
                        <Button onPress={()=>{
                            setDataPendingVis(false);
                            forceSync();}}>
                                {t('general-settings.confirm')}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            <AlertBar visible={dataPushedVis} setVisible={setDataPushedVis} messageKey='all data pushed!'></AlertBar>
        </>
    )
}

//UI for editing the sync config
const ControlSyncHelper = ({ editVis, setEditVis }) => {
    const { t } = useTranslation(); 
    const { colors } = useTheme();
    const CommHelper = getAngularService("CommHelper");
    const Logger = getAngularService("Logger");

    const [ localConfig, setLocalConfig ] = useState<syncConfig>();
    const [ intervalVis, setIntervalVis ] = useState<boolean>(false);

    /* 
     * Functions to read and format values for display
     */
    async function getSyncSettings() {
        let tempConfig = await getConfig();
        setLocalConfig(tempConfig);
    }

    useEffect(() => {
        getSyncSettings();
    }, [editVis])

    const syncIntervalActions = [
        {text: "1 min", value: 60},
        {text: "10 min", value: 10 * 60},
        {text: "30 min", value: 30 * 60},
        {text: "1 hr", value: 60 * 60}
    ]

    /* 
     * Functions to edit and save values
     */
    async function saveAndReload() {
        console.log("new config = "+localConfig);
        try{
            let set = setConfig(localConfig);
            //NOTE -- we need to make sure we update these settings in ProfileSettings :) -- getting rid of broadcast handling for migration!!
            CommHelper.updateUser({
                // TODO: worth thinking about where best to set this
                // Currently happens in native code. Now that we are switching
                // away from parse, we can store this from javascript here. 
                // or continue to store from native
                // this is easier for people to see, but means that calls to
                // native, even through the javascript interface are not complete
                curr_sync_interval: localConfig.sync_interval
            });
        } catch (err)
        {
            console.log("error with setting sync config", err);
            Logger.displayError("Error while setting sync config", err);
        }
    }

    const onChooseInterval = function(interval) {
        let tempConfig = {...localConfig};
        tempConfig.sync_interval = interval.value;
        setLocalConfig(tempConfig);
    }

    const onTogglePush = function() {
        let tempConfig = {...localConfig};
        tempConfig.ios_use_remote_push = !localConfig.ios_use_remote_push;
        setLocalConfig(tempConfig);
    }

    /*
    * configure the UI
    */
   let toggle;
   if(window.cordova.platformId == 'ios'){
       toggle = <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="labelMedium">Use Remote Push</Text>
                    <Switch value={localConfig?.ios_use_remote_push} onValueChange={onTogglePush}></Switch>
                </View>
   }
  
    return (
        <>
            {/* popup to show when we want to edit */}
            <Modal visible={editVis} onDismiss={() => setEditVis(false)} transparent={true}>
                <Dialog visible={editVis} onDismiss={() => setEditVis(false)} style={settingStyles.dialog(colors.elevation.level3)}>
                    <Dialog.Title>Edit Sync Settings</Dialog.Title>
                    <Dialog.Content>
                        <View style={{ paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text variant="labelMedium">Sync Interval</Text>
                            <Button onPress={() => setIntervalVis(true)}>{localConfig?.sync_interval}</Button>
                        </View>
                        {toggle}
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => {saveAndReload();
                                                setEditVis(false);}}>
                            Save
                        </Button>
                        <Button onPress={() => setEditVis(false)}>Cancel</Button>
                    </Dialog.Actions>
                </Dialog>
            </Modal>

            <ActionMenu vis={intervalVis} setVis={setIntervalVis} title={"Select sync interval"} actionSet={syncIntervalActions} onAction={onChooseInterval} onExit={() => {}}></ActionMenu>
        </>
    );
  };
  
export default ControlSyncHelper;