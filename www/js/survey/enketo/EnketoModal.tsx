import React, { useRef, useEffect } from 'react';
import { Form } from 'enketo-core';
import { StyleSheet, Modal, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { Button, Icon, ModalProps } from 'react-native-paper';
import useAppConfig from '../../useAppConfig';
import { useTranslation } from 'react-i18next';
import { SurveyOptions, fetchSurvey, getInstanceStr, saveResponse } from './enketoHelper';
import { displayError, displayErrorMsg, logDebug } from '../../plugin/logger';

type Props = Omit<ModalProps, 'children'> & {
  surveyName: string;
  onResponseSaved: (response: any) => void;
  opts?: SurveyOptions;
};

const EnketoModal = ({ surveyName, onResponseSaved, opts, ...rest }: Props) => {
  const { t, i18n } = useTranslation();
  const headerEl = useRef<HTMLElement>(null);
  const surveyJson = useRef<any>(null);
  const enketoForm = useRef<Form | null>(null);
  const appConfig = useAppConfig();

  async function validateAndSave() {
    const valid = await enketoForm.current.validate();
    if (!valid) return false;
    try {
      const result = await saveResponse(surveyName, enketoForm.current, appConfig, opts);
      if (result) {
        // success
        rest.onDismiss?.();
        onResponseSaved(result);
      } else {
        // validation failed
        displayErrorMsg(t('survey.enketo-form-errors'));
      }
    } catch (err) {
      displayError(err);
    }
  }

  // init logic: retrieve form -> inject into DOM -> initialize Enketo -> show modal
  function initSurvey() {
    logDebug('EnketoModal: loading survey ' + surveyName);
    const formPath = appConfig.survey_info?.surveys?.[surveyName]?.formPath;
    if (!formPath) return displayErrorMsg('No form path found for survey ' + surveyName);

    fetchSurvey(formPath).then(({ form, model }) => {
      surveyJson.current = { form, model };
      headerEl?.current?.insertAdjacentHTML('afterend', form); // inject form into DOM
      const formEl = document.querySelector('form.or');
      const data = {
        modelStr: model, // the XML model for this form
        instanceStr: getInstanceStr(model, opts), // existing XML instance (if any), may be a previous response or a pre-filled model
        /* There are a few other opts that can be passed to Enketo Core.
          We don't use these now, but we may want them later: https://github.com/enketo/enketo-core#usage-as-a-library */
      };
      const currLang = i18n.resolvedLanguage || 'en';
      enketoForm.current = new Form(formEl, data, { language: currLang });
      enketoForm.current.init();
    });
  }

  useEffect(() => {
    if (!rest.visible || !appConfig) return;
    initSurvey();

    // on dev builds, allow skipping survey with ESC
    if (__DEV__) {
      const handleKeyDown = (e) => e.key === 'Escape' && onResponseSaved(null);
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [appConfig, rest.visible]);

  /* adapted from the template given by enketo-core:
    https://github.com/enketo/enketo-core/blob/master/src/index.html */
  const enketoContent = (
    <div className="main touch" style={{ height: '100%' }}>
      <article className="paper" data-tap-disabled="true">
        {/* This form header (markup/css) can be changed in the application.
        Just make sure to keep a .form-language-selector element into which the form language selector (<select>)
        will be appended by Enketo Core. */}
        <header ref={headerEl} className="form-header clearfix">
          {!opts?.undismissable && (
            <button style={s.dismissBtn} onClick={() => rest.onDismiss?.()}>
              {/* arrow-left glyph from https://pictogrammers.com/library/mdi/icon/arrow-left/ */}
              <span style={{ fontFamily: 'MaterialCommunityIcons', fontSize: 24, marginRight: 5 }}>
                󰁍
              </span>
              <span>{t('survey.dismiss')}</span>
            </button>
          )}
          <span className="form-language-selector hide">
            <span>Choose Language</span>
          </span>
          <nav className="pages-toc hide" role="navigation">
            <label htmlFor="toc-toggle"></label>
            <input type="checkbox" id="toc-toggle" className="ignore" value="show" />
            {/* this element can be placed anywhere, leaving it out will prevent running ToC-generating code */}
            <ul className="pages-toc__list"></ul>
            <div className="pages-toc__overlay"></div>
          </nav>
        </header>

        {/* The retrieved form will be injected here */}

        <section className="form-footer" style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Used some quick-and-dirty inline CSS styles here because the form-footer should be styled in the
          mother application. The HTML markup can be changed as well. */}
          <a
            href="#"
            className="previous-page disabled"
            style={{ position: 'absolute', left: 10, bottom: 40 }}>
            {t('survey.back')}
          </a>
          <a
            id="validate-form"
            className="btn btn-primary"
            onClick={() => validateAndSave()}
            style={{ width: 200, margin: 'auto' }}>
            {/* <Button icon="check-bold" mode="contained"> */}
            {t('survey.save')}
            {/* </Button> */}
          </a>
          <a
            href="#"
            className="btn btn-primary next-page disabled"
            style={{ width: 200, margin: 'auto' }}>
            {/* <Button icon="arrow-right-thick" mode="contained"> */}
            {t('survey.next')}
            {/* </Button> */}
          </a>
          <div className="enketo-power" style={{ marginBottom: 30 }}>
            <span>{t('survey.powered-by')}</span>{' '}
            <a href="http://enketo.org" title="enketo.org website">
              <img src="img/enketo_bare_150x56.png" alt="enketo logo" />
            </a>
          </div>
          <div className="form-footer__jump-nav" style={{ display: 'flex', flexDirection: 'row' }}>
            <a
              href="#"
              className="btn btn-default disabled first-page"
              style={{ display: 'inline-flex', flex: 1, borderRadius: 0 }}>
              <Icon source={'arrow-u-left-top'} size={16} />
              <span style={{ margin: 'auto' }}>{t('survey.return-to-beginning')}</span>
            </a>
            <a
              href="#"
              className="btn btn-default disabled last-page"
              style={{ display: 'inline-flex', flex: 1, borderRadius: 0 }}>
              <span style={{ margin: 'auto' }}>{t('survey.go-to-end')}</span>
              <Icon source={'page-last'} size={16} />
            </a>
          </div>
          {/* <ol className="page-toc"></ol> */}
        </section>
      </article>
    </div>
  );

  return (
    <Modal {...rest} animationType="slide">
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flex: 1 }}>
          <Pressable style={{ flex: 1 }}>
            <div className="enketo-plugin">{enketoContent}</div>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const s = StyleSheet.create({
  dismissBtn: {
    height: 38,
    fontSize: 11,
    color: '#222',
    marginRight: 'auto',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },
});

export default EnketoModal;
