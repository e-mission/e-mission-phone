import React, { useContext, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { View, Image, Modal, ScrollView, StyleSheet, ViewStyle, useWindowDimensions } from 'react-native';
import { Button, Dialog, Divider, IconButton, Surface, Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper';
import color from 'color';
import { initByUser } from '../config/dynamicConfig';
import { AppContext } from '../App';
import { displayError } from "../plugin/logger";
import { onboardingStyles } from './OnboardingStack';
import { Icon } from '../components/Icon';

const WelcomePage = () => {

  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const context = useContext(AppContext);
  const { refreshOnboardingState } = context;
  const [pasteModalVis, setPasteModalVis] = useState(false);
  const [infoPopupVis, setInfoPopupVis] = useState(false);
  const [existingToken, setExistingToken] = useState('');

  const scanCode = function() {
    window.cordova.plugins.barcodeScanner.scan(
      function (result) {
        console.debug("scanned code", result);
          if (result.format == "QR_CODE" && 
              result.cancelled == false) {
                let text = result.text.split("=")[1];
                console.log("found code", text);
              loginWithToken(text);
          } else {
            displayError(result.text, "invalid study reference") ;
          }
      },
      function (error) {
        displayError(error, "Scanning failed: ");
      });
  };

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
    <Surface style={[onboardingStyles.page, {paddingVertical: 0}]}>
      <View style={s.headerArea(windowWidth, colors)} aria-hidden={true} />
      <IconButton icon='information-variant' containerColor={colors.onPrimary} iconColor={colors.primary}
        size={40} mode='outlined' style={s.infoButton} onPress={() => setInfoPopupVis(true)} />
      <Surface elevation={1} style={s.appIconWrapper(colors)}>
        <Image style={s.appIcon(colors)} source={require('../../../resources/icon.png')} />
      </Surface>
      <Text variant='headlineSmall' style={s.welcomeTitle}>
        <Trans i18nKey='join.welcome-to-app' values={{appName: t('join.app-name')}}
        components={{b: <Text style={{fontWeight: 'bold'}}> </Text>}} />
      </Text>
      <View style={{ marginVertical: 15, gap: 10 }}>
        <Text>{t('join.to-proceed-further')}</Text>
        <Text>{t('join.code-hint')}</Text>
      </View>
      <View style={s.buttonsSection}>
        <View style={{ width: windowWidth/2 - 5, paddingHorizontal: 10, gap: 8 }}>
          <WelcomePageButton onPress={scanCode} icon='qrcode'>
            {t('join.scan-code')}
          </WelcomePageButton>
          <Text style={{ textAlign: 'center', margin: 'auto' }}>{t('join.scan-hint')}</Text>
        </View>
        <Divider style={{ width: 2, height: '100%' }} />
        <View style={{ width: windowWidth/2 - 5, paddingHorizontal: 10, gap: 8 }}>
          <WelcomePageButton onPress={() => setPasteModalVis(true)} icon='content-paste'>
            {t('join.paste-code')}
          </WelcomePageButton>
          <Text style={{ textAlign: 'center', margin: 'auto' }}>{t('join.paste-hint')}</Text>
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
    <Modal visible={infoPopupVis} transparent={true} onDismiss={() => setInfoPopupVis(false)}>
      <Dialog visible={infoPopupVis} onDismiss={() => setInfoPopupVis(false)}>
        <Dialog.Title>
          {t('join.about-app-title', {appName: t('join.app-name')})}
        </Dialog.Title>
        <Dialog.Content>
          <ScrollView>
            <Text>{t('join.about-app-para-1')}</Text>
            <Text>{t('join.about-app-para-2')}</Text>
            <Text>{t('join.about-app-para-3')}</Text>
            <Text style={{ marginTop: 10, fontWeight: 'bold' }}>{t('join.tips-title')}</Text>
            <Text>- {t('join.all-green-status')}</Text>
            <Text>- {t('join.dont-force-kill')}</Text>
            <Text>- {t('join.background-restrictions')}</Text>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setInfoPopupVis(false)}>{t('join.close')}</Button>
        </Dialog.Actions>
      </Dialog>
    </Modal>
  </>);
}

const s: any = StyleSheet.create({
  headerArea: ((windowWidth, colors) => ({
    width: windowWidth * 2.5,
    height: windowWidth,
    left: -windowWidth * .75,
    borderBottomRightRadius: '50%',
    borderBottomLeftRadius: '50%',
    position: 'absolute',
    top: windowWidth * -2/3,
    backgroundColor: colors.primary,
    boxShadow: `0 16px ${color(colors.primary).alpha(0.3).rgb().string()}`,
  })) as ViewStyle,
  appIconWrapper: ((colors): ViewStyle => ({
    marginTop: 20,
    width: 200,
    height: 200,
    alignSelf: 'center',
    backgroundColor: color(colors.onPrimary).darken(0.1).alpha(0.4).rgb().string(),
    padding: 10,
    borderRadius: 32,
  })) as ViewStyle,
  infoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    elevation: 2,
  },
  appIcon: ((colors): ViewStyle => ({
    width: '100%',
    height: '100%',
    backgroundColor: colors.onPrimary,
    borderRadius: 24,
  })) as ViewStyle,
  welcomeTitle: {
    marginTop: 20,
    textAlign: 'center',
    paddingVertical: 20,
  },
  buttonsSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
});


const WelcomePageButton = ({ onPress, icon, children }) => {

  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  return (
    <TouchableRipple onPress={onPress} style={welcomeButtonStyles.wrapper(colors)}>
      <View style={welcomeButtonStyles.btn(colors)}>
        <Icon icon={icon} size={68} iconColor={colors.onPrimary} />
        <Text variant='titleSmall' style={{ color: colors.onPrimary }}>
          {children}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const welcomeButtonStyles: any = StyleSheet.create({
  btn: ((colors): ViewStyle => ({
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 21,
    padding: 20,
    gap: 8,
  })) as ViewStyle,
  wrapper: ((colors): ViewStyle => ({
    borderRadius: 26,
    padding: 5,
    backgroundColor: color(colors.primary).alpha(0.4).rgb().string(),
  })) as ViewStyle,
});

export default WelcomePage;
