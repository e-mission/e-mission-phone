import React, { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Image, Modal, StyleSheet } from 'react-native';
import { Button, Dialog, Divider, Surface, Text, TextInput } from 'react-native-paper';
import { initByUser } from '../config/dynamicConfig';
import { AppContext } from '../App';
import { onboardingStyles } from './OnboardingStack';

const WelcomePage = () => {

  const { t } = useTranslation();
  const context = useContext(AppContext);
  const { refreshOnboardingState } = context;
  const [pasteModalVis, setPasteModalVis] = useState(false);
  const [existingToken, setExistingToken] = useState('');

  function scanCode() {
    console.debug('scanCode');
    // TODO
  }

  function loginWithToken(token) {
    initByUser({token}).then((configUpdated) => {
      if (configUpdated) {
        setPasteModalVis(false);
        refreshOnboardingState();
      }
    }).catch(err => {
      console.error('Error logging in with token', err);
      setExistingToken('');
    });
  }

  return (<>
    <Surface style={onboardingStyles.page}>
      {/* <Image source={appIcon} style={{ width: 100, height: 100, alignSelf: 'center' }} /> */}
      <Text variant='headlineMedium' style={s.welcomeTitle}>
        {t('join.welcome-to-nrel-openpath')}
      </Text>
      <View>
        <Text> {t('join.proceed-further')} </Text>
        <Text> {t('join.what-is-opcode')} </Text>
        <View style={{paddingVertical: 20}}>
          <Button onPress={scanCode}> {t('join.scan-button')} </Button>
          <Text> {t('join.scan-details')} </Text>
        </View>
        <Divider />
        <Text style={{textAlign: 'center'}}> - {t('join.or')} - </Text>
        <Divider />
        <View style={{paddingVertical: 20}}>
          <Button onPress={() => setPasteModalVis(true)}> {t('join.paste-button')} </Button>
          <Text> {t('join.paste-details')} </Text>
        </View>
      </View>
    </Surface>
    <Modal visible={pasteModalVis} transparent={true} onDismiss={() => setPasteModalVis(false)}>
      <Dialog visible={pasteModalVis} onDismiss={() => setPasteModalVis(false)}>
        <TextInput label={t('login.enter-existing-token')}
          autoComplete='username' autoCapitalize='none' autoCorrect={false}
          value={existingToken} onChangeText={setExistingToken}
          contentStyle={{fontFamily: 'monospace'}} />
        <Dialog.Actions>
          <Button onPress={() => setPasteModalVis(false)}> {t('login.button-decline')} </Button>
          <Button onPress={() => loginWithToken(existingToken)}> {t('login.button-accept')} </Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  </>);
}

const s = StyleSheet.create({
  welcomeTitle: {
    marginTop: 20,
    textAlign: 'center',
    paddingVertical: 20,
    fontWeight: '600',
  },
});

export default WelcomePage;
