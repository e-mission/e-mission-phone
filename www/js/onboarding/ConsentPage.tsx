import React, { useContext, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Image, Modal, StyleSheet, ScrollView } from 'react-native';
import { Button, Dialog, Divider, Surface, Text, TextInput, List } from 'react-native-paper';
import { initByUser, resetDataAndRefresh } from '../config/dynamicConfig';
import { AppContext } from '../App';
import { getAngularService } from '../angular-react-helper';
import { displayError, displayErrorMsg } from '../plugin/logger';
import i18next from "i18next";
import PrivacyPolicy from '../join/PrivacyPolicy';

const JoinPage = () => {

  const { t } = useTranslation();
  const context = useContext(AppContext);
  const { pendingOnboardingState, refreshOnboardingState } = context;

  /* If the user does not consent, we boot them back out to the join screen */
  function disagree() {
    resetDataAndRefresh();
  };

  function agree() {
    const StartPrefs = getAngularService('StartPrefs');
    StartPrefs.markConsented().then((response) => {
      login(pendingOnboardingState.opcode).then((response) => {

        refreshOnboardingState();
      });
    });
  };

  function login(token) {
    const CommHelper = getAngularService('CommHelper');
    const KVStore = getAngularService('KVStore');
    const EXPECTED_METHOD = "prompted-auth";
    const dbStorageObject = {"token": token};
    return KVStore.set(EXPECTED_METHOD, dbStorageObject).then((r) => {
      // ionicToast.show(message, position, stick, time);
      // $scope.next();
      // ionicToast.show(opcode, 'middle', false, 2500);
      CommHelper.registerUser((successResult) => {
        refreshOnboardingState();
      }, function(errorResult) {
        displayError(errorResult, "User registration error");
      });
    }).catch((e) => {
      displayError(e, "Sign in error");
    });
  };

  const getTemplateText = function(configObject) {
    if (configObject && (configObject.name)) {
        return configObject.intro.translated_text[i18next.language];
    }
  }

  const templateText = useMemo(() => getTemplateText(context.appConfig), [context.appConfig]);

  //summary of the study, privacy policy, data, etc, and accept/reject
  return (<>
    <Surface style={s.page}>
      <ScrollView>
        <PrivacyPolicy></PrivacyPolicy>
        <Button onPress={agree}> {t('consent.button-accept')} </Button>
        <Button onPress={disagree}> {t('consent.button-decline')} </Button>
      </ScrollView>
    </Surface>
  </>);
}

const s = StyleSheet.create({
  welcomeTitle: {
    marginTop: 20,
    textAlign: 'center',
    paddingVertical: 20,
    fontWeight: '600',
  },
  page: {
    paddingHorizontal: 15,
    flex: 1
  },
});

export default JoinPage;
