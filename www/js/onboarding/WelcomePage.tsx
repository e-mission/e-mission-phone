import React, { useContext, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  View,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import {
  Button,
  Dialog,
  Divider,
  Icon,
  IconButton,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import color from 'color';
import { AppContext } from '../App';
import { displayError, logDebug, logWarn } from '../plugin/logger';
import { onboardingStyles } from './OnboardingStack';
import { AlertManager } from '../components/AlertBar';
import { addStatReading } from '../plugin/clientStats';

let barcodeScannerIsOpen = false;

const WelcomePage = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const { handleTokenOrUrl } = useContext(AppContext);
  const [pasteModalVis, setPasteModalVis] = useState(false);
  const [infoPopupVis, setInfoPopupVis] = useState(false);
  const [existingToken, setExistingToken] = useState('');

  function scanCode() {
    if (barcodeScannerIsOpen) return;
    barcodeScannerIsOpen = true;
    addStatReading('open_qr_scanner');
    window['cordova'].plugins.barcodeScanner.scan(
      (result) => {
        barcodeScannerIsOpen = false;
        logDebug('scanCode: scanned ' + JSON.stringify(result));
        if (result.cancelled) return;
        if (!result?.text || result.format != 'QR_CODE') {
          AlertManager.addMessage({ text: 'No QR code found in scan. Please try again.' });
          return;
        }
        handleTokenOrUrl(result.text, 'scan');
      },
      (error) => {
        barcodeScannerIsOpen = false;
        AlertManager.addMessage({ text: 'Scanning failed: ' + error.message });
      },
    );
  }

  function pasteCode() {
    // if clipboard plugin not available, the callback will be a no-op
    const pasteFn = window['cordova'].plugins.clipboard?.paste || ((cb) => cb(''));
    pasteFn((clipboardContent: string) => {
      addStatReading('paste_token');
      try {
        if (!clipboardContent?.startsWith('nrelop_') && !clipboardContent?.includes('://')) {
          throw new Error('Clipboard content is not a valid token or URL');
        }
        handleTokenOrUrl(clipboardContent, 'paste');
      } catch (e) {
        logWarn(`Tried using clipboard content ${clipboardContent}: ${e}`);
        setPasteModalVis(true);
      }
    });
  }

  return (
    <>
      <Surface style={[onboardingStyles.page, { paddingVertical: 0 }]}>
        <View style={s.headerArea(windowWidth, colors)} aria-hidden={true} />
        <IconButton
          accessibilityLabel={t('join.more-info')}
          icon="information-variant"
          containerColor={colors.onPrimary}
          iconColor={colors.primary}
          size={40}
          mode="outlined"
          style={s.infoButton}
          onPress={() => setInfoPopupVis(true)}
        />
        <Surface elevation={1} style={s.appIconWrapper(colors)}>
          <Image style={s.appIcon(colors)} source={require('../../../resources/icon.png')} />
        </Surface>
        <ScrollView>
          <Text variant="headlineSmall" style={s.welcomeTitle}>
            <Trans
              i18nKey="join.welcome-to-app"
              values={{ appName: t('join.app-name') }}
              components={{ b: <Text style={{ fontWeight: 'bold' }}> </Text> }}
            />
          </Text>
          <View style={{ marginVertical: 15, gap: 10 }}>
            <Text>{t('join.to-proceed-further')}</Text>
            <Text>{t('join.code-hint')}</Text>
          </View>
          <View style={s.buttonsSection}>
            <View style={{ width: windowWidth / 2 - 5, paddingHorizontal: 10, gap: 8 }}>
              <View accessibilityRole="button">
                <WelcomePageButton onPress={scanCode} icon="qrcode">
                  {t('join.scan-code')}
                </WelcomePageButton>
              </View>
              <Text style={{ textAlign: 'center', margin: 'auto' }}>{t('join.scan-hint')}</Text>
            </View>
            <Divider style={{ width: 2, height: '100%' }} />
            <View style={{ width: windowWidth / 2 - 5, paddingHorizontal: 10, gap: 8 }}>
              <View accessibilityRole="button">
                <WelcomePageButton onPress={pasteCode} icon="content-paste">
                  {t('join.paste-code')}
                </WelcomePageButton>
              </View>
              <Text style={{ textAlign: 'center', margin: 'auto' }}>{t('join.paste-hint')}</Text>
            </View>
          </View>
        </ScrollView>
      </Surface>
      <Modal visible={pasteModalVis} transparent={true} onDismiss={() => setPasteModalVis(false)}>
        <Dialog visible={pasteModalVis} onDismiss={() => setPasteModalVis(false)}>
          <TextInput
            label={t('login.enter-existing-token')}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect={false}
            value={existingToken}
            onChangeText={setExistingToken}
            contentStyle={{ fontFamily: 'monospace' }}
          />
          <Dialog.Actions>
            <Button onPress={() => setPasteModalVis(false)}>{t('login.button-decline')}</Button>
            <Button
              onPress={() =>
                handleTokenOrUrl(existingToken, 'textbox').catch((e) =>
                  displayError(e, `Tried using token ${existingToken}`),
                )
              }>
              {t('login.button-accept')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>
      <Modal visible={infoPopupVis} transparent={true} onDismiss={() => setInfoPopupVis(false)}>
        <Dialog
          visible={infoPopupVis}
          onDismiss={() => setInfoPopupVis(false)}
          style={{ maxHeight: '80%' }}>
          <Dialog.Title>{t('join.about-app-title', { appName: t('join.app-name') })}</Dialog.Title>
          <ScrollView>
            <Dialog.Content>
              <Text>{t('join.about-app-para-1')}</Text>
              <Text>{t('join.about-app-para-2')}</Text>
              <Text>{t('join.about-app-para-3')}</Text>
              <Text style={{ marginTop: 10, fontWeight: 'bold' }}>{t('join.tips-title')}</Text>
              <Text>- {t('join.all-green-status')}</Text>
              <Text>- {t('join.dont-force-kill')}</Text>
              <Text>- {t('join.background-restrictions')}</Text>
            </Dialog.Content>
          </ScrollView>
          <Dialog.Actions>
            <Button onPress={() => setInfoPopupVis(false)}>{t('join.close')}</Button>
          </Dialog.Actions>
        </Dialog>
      </Modal>
    </>
  );
};

const s: any = StyleSheet.create({
  headerArea: ((windowWidth, colors) => ({
    width: windowWidth * 2.5,
    height: windowWidth,
    left: -windowWidth * 0.75,
    borderBottomRightRadius: '50%',
    borderBottomLeftRadius: '50%',
    position: 'absolute',
    top: (windowWidth * -2) / 3,
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
        <Icon source={icon} size={68} color={colors.onPrimary} />
        <Text variant="titleSmall" style={{ color: colors.onPrimary }}>
          {children}
        </Text>
      </View>
    </TouchableRipple>
  );
};

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
