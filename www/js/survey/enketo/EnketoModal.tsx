import React, { useRef, useEffect } from 'react';
import { Form } from 'enketo-core';
import { StyleSheet, Modal, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { ModalProps } from 'react-native-paper';
import useAppConfig from '../../useAppConfig';
import { useTranslation } from 'react-i18next';
import { SurveyOptions, getInstanceStr, saveResponse } from './enketoHelper';
import { fetchUrlCached } from '../../commHelper';
import { displayError, displayErrorMsg } from '../../plugin/logger';
// import { transform } from 'enketo-transformer/web';

type Props = Omit<ModalProps, 'children'> & {
  surveyName: string,
  onResponseSaved: (response: any) => void,
  opts?: SurveyOptions,
}

const EnketoModal = ({ surveyName, onResponseSaved, opts, ...rest } : Props) => {

  const { t, i18n } = useTranslation();
  const headerEl = useRef(null);
  const surveyJson = useRef(null);
  const enketoForm = useRef<Form | null>(null);
  const appConfig = useAppConfig();

  async function fetchSurveyJson(url) {
    const responseText = await fetchUrlCached(url);
    try {
      return JSON.parse(responseText);
    } catch ({name, message}) {
      // not JSON, so it must be XML
      return Promise.reject('downloaded survey was not JSON; enketo-transformer is not available yet');
      /* uncomment once enketo-transformer is available */
      // if `response` is not JSON, it is an XML string and needs transformation to JSON
      // const xmlText = await res.text();
      // return await transform({xform: xmlText});
    }
  }

  async function validateAndSave() {
    const valid = await enketoForm.current.validate();
    if (!valid) return false;
    const result = await saveResponse(surveyName, enketoForm.current, appConfig, opts);
    if (!result) { // validation failed
      displayErrorMsg(t('survey.enketo-form-errors'));
    } else if (result instanceof Error) { // error thrown in saveResponse
      displayError(result);
    } else { // success
      rest.onDismiss();
      onResponseSaved(result);
      return;
    }
  }

  // init logic: retrieve form -> inject into DOM -> initialize Enketo -> show modal 
  function initSurvey() {
    console.debug('Loading survey', surveyName);
    const formPath = appConfig.survey_info?.surveys?.[surveyName]?.formPath;
    if (!formPath) return console.error('No form path found for survey', surveyName);

    fetchSurveyJson(formPath).then(({ form, model }) => {
      surveyJson.current = { form, model };
      headerEl?.current.insertAdjacentHTML('afterend', form); // inject form into DOM
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
    if (!rest.visible) return;
    if (!appConfig) return console.error('App config not loaded yet');
    initSurvey();
  }, [appConfig, rest.visible]);

  /* adapted from the template given by enketo-core:
    https://github.com/enketo/enketo-core/blob/master/src/index.html */
  const enketoContent = (
    <div className="main" id="survey-paper">
      <article className="paper" data-tap-disabled="true">
        {/* This form header (markup/css) can be changed in the application.
        Just make sure to keep a .form-language-selector element into which the form language selector (<select>)
        will be appended by Enketo Core. */}
        <header ref={headerEl} className="form-header clearfix">
          {!opts.undismissable &&
            <button style={s.dismissBtn} onClick={() => rest.onDismiss()}>
              {/* arrow-left glyph from https://pictogrammers.com/library/mdi/icon/arrow-left/ */}
              <span style={{fontFamily: 'MaterialCommunityIcons', fontSize: 24, marginRight: 5}}>󰁍</span>
              <span>{t('survey.dismiss')}</span>
            </button>
          }
          <span className="form-language-selector hide"><span>Choose Language</span></span>
          <nav className="pages-toc hide" role="navigation">
            <label htmlFor="toc-toggle"></label>
            <input type="checkbox" id="toc-toggle" className="ignore" value="show" />
            {/* this element can be placed anywhere, leaving it out will prevent running ToC-generating code */}
            <ul className="pages-toc__list"></ul>
            <div className="pages-toc__overlay"></div>
          </nav>
        </header>

        {/* The retrieved form will be injected here */}

        <section className="form-footer">
          {/* Used some quick-and-dirty inline CSS styles here because the form-footer should be styled in the
          mother application. The HTML markup can be changed as well. */}
          <a href="#" className="previous-page disabled" style={{ position: 'absolute', left: 10, bottom: 40 }}>{t('survey.back')}</a>
          <button id="validate-form" className="btn btn-primary" onClick={() => validateAndSave()}
              style={{ width: 200, marginLeft: 'calc(50% - 100px)' }}>
            {t('survey.save')}
          </button>
          <a href="#survey-paper" className="btn btn-primary next-page disabled" style={{ width: 200, marginLeft: 'calc(50% - 100px' }}>{t('survey.next')}</a>
          <div className="enketo-power" style={{ marginBottom: 30 }}><span>{t('survey.powered-by')}</span> <a href="http://enketo.org" title="enketo.org website"><img src="img/enketo_bare_150x56.png" alt="enketo logo" /></a> </div>
          <div className="form-footer__jump-nav" style={{ display: 'flex', flexDirection: 'row' }}>
            <a href="#" className="btn btn-default disabled first-page" style={{ flex: 1, borderRadius: 0 }}>{t('survey.return-to-beginning')}</a>
            <a href="#" className="btn btn-default disabled last-page" style={{ flex: 1, borderRadius: 0 }}>{t('survey.go-to-end')}</a>
          </div>
          {/* <ol className="page-toc"></ol> */}
        </section>
      </article>
    </div>
  );

  return (
    <Modal {...rest} animationType='slide'>
      <SafeAreaView style={{flex: 1}}>
        <ScrollView style={{flex: 1}} contentContainerStyle={{flex: 1}}>
          <Pressable style={{flex: 1}}>
            <div className="enketo-plugin">
              {enketoContent}
            </div>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  dismissBtn: {
    height: 38,
    fontSize: 11,
    color: '#222',
    marginRight: 'auto',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  }
});

export default EnketoModal;
