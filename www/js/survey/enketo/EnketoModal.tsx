import React, { useState, useRef, useEffect } from 'react';
import { Form } from 'enketo-core';
import { Modal, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { Appbar, ModalProps } from 'react-native-paper';
import useAppConfig from '../../useAppConfig';
import { useTranslation } from 'react-i18next';
// import { transform } from 'enketo-transformer/web';

type Props = ModalProps & {
  surveyName: string,
  opts?: {
    timelineEntry?: any;
    instanceStr?: string;
    prefilledSurveyResponse?: string;
    prefillFields?: {[key: string]: string};
    dataKey?: string;
  }
}

const EnketoModal = ({ surveyName, opts, ...rest } : Props) => {

  const { t, i18n } = useTranslation();
  const headerEl = useRef(null);
  const surveyJson = useRef(null);
  // const loadedForm = useRef(null);
  // const loadedModel = useRef(null);
  const enketoForm = useRef<Form | null>(null);
  const { appConfig, loading } = useAppConfig();

  async function fetchSurveyJson(url) {
    const res = await fetch(url);
    if (url.toUpperCase().endsWith('.JSON')) {
      return await res.json();
    } else {
      return Promise.reject('downloaded survey was not JSON; enketo-transformer is not available yet');
      /* uncomment once enketo-transformer is available */
      // if `response` is not JSON, so it is an XML string and needs transformation to JSON
      // const xmlText = await res.text();
      // return await transform({xform: xmlText});
    }
  }

  function validateAndSave() {

  }

  // init logic: retrieve form -> inject into DOM -> initialize Enketo -> show modal 
  useEffect(() => {
    if (!rest.visible) return;
    if (!appConfig || loading) return console.error('App config not loaded yet');
    console.debug('Loading survey', surveyName);
    const formPath = appConfig.survey_info?.surveys?.[surveyName]?.formPath;
    if (!formPath) return console.error('No form path found for survey', surveyName);

    fetchSurveyJson(formPath).then(({ form, model }) => {
      surveyJson.current = { form, model };
      headerEl?.current.insertAdjacentHTML('afterend', form);
      const formEl = document.querySelector('form.or');
      const data = {
        // required string of the default instance defined in the XForm
        modelStr: model,
        // optional string of an existing instance to be edited
        instanceStr: opts.instanceStr || null,
        submitted: opts.submitted || false,
        external: opts.external || [],
        session: opts.session || {}
      };
      const currLang = i18n.resolvedLanguage || 'en';
      enketoForm.current = new Form(formEl, data, { language: currLang });
      enketoForm.current.init();
    });
  }, [appConfig, loading, rest.visible]);

  const enketoContent = (
    <div className="main" id="survey-paper">
      <article className="paper" data-tap-disabled="true">
        {/* This form header (markup/css) can be changed in the application.
        Just make sure to keep a .form-language-selector element into which the form language selector (<select>)
        will be appended by Enketo Core. */}
        <header ref={headerEl} className="form-header clearfix">
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
          <button id="validate-form" className="btn btn-primary" onPress={validateAndSave()} style={{ width: 200, marginLeft: 'calc(50% - 100px)' }}>{t('survey.save')}</button>
          <a href="#survey-paper" className="btn btn-primary next-page disabled" style={{ width: 200, marginLeft: 'calc(50% - 100px' }}>{t('survey.next')}</a>

          <div className="enketo-power" style={{ marginBottom: 30 }}><span>{t('survey.powered-by')}</span> <a href="http://enketo.org" title="enketo.org website"><img src="templates/survey/enketo/enketo_bare_150x56.png" alt="enketo logo" /></a> </div>
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
        <Appbar.Header statusBarHeight={0} elevated={true} style={{ height: 46, backgroundColor: 'white', elevation: 3 }}>
          <Appbar.BackAction onPress={() => { rest.onDismiss() }} />
          <Appbar.Content title={t('survey.survey')} />
        </Appbar.Header>
        <ScrollView>
          <Pressable>
            <div className="enketo-plugin">
              {enketoContent}
            </div>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default EnketoModal;
