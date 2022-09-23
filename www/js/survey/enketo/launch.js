'use strict';

angular.module('emission.survey.enketo.launch', [
  'emission.services',
  'emission.survey.enketo.service',
  'emission.plugin.logger',
])
.factory('EnketoSurveyLaunch', function(
  $ionicPopup, EnketoSurvey, $ionicModal,
) {
  /**
   * @typedef EnketoSurveyLaunchState
   * @type {{
   *  modal: object;
   *  name: string;
   *  opts: {
   *    trip: object;
   *    disableDismiss: boolean;
   *    onInit: Function;
   *    onNext: Function;
   *    showBackButton: boolean | undefined;
   *    showFormFooterNav: boolean | undefined;
   *  };
   *  scope: object;
   * }}
   */

  /** @type {EnketoSurveyLaunchState} _state */
  let _state;

  /**
   * _resetState reset state object to its initial value
   */
  function _resetState() {
    if (_state && _state.modal) {
      _state.modal.remove(); // remove modal object inorder to reset everything and makes it ready for the next launch
    }
    _state = {
      modal: null,
      name: null,
      opts: {
        trip: null,
        disableDismiss: false,
        onInit: () => {},
        onNext: () => {},
      },
      scope: null,
    };
  }

  /**
   * initSurvey
   * @param {string} name survey name
   * @param {{
   *  trip?: object;
   * }} [opts] survey launch options 
   * @returns {Promise<void>}
   */
  function initSurvey(name, opts) {
    return EnketoSurvey.load(name, opts).then(() => {
      $('.enketo-plugin .form-header').after(EnketoSurvey.getState().loaded.form);
      if (!opts.showBackButton) { $(".enketo-plugin .previous-page").hide() };
      if (!opts.showFormFooterJumpNav) { $(".enketo-plugin .form-footer__jump-nav").hide() };
    }).then(EnketoSurvey.showModal
    ).then(loadErrors => {
			// Ignore 'Different root nodes' error: START
			const idx = loadErrors.findIndex((errTxt) => errTxt.includes('Different root nodes'));
			if (idx !== -1) {
        loadErrors.splice(idx, 1);
			}
			// Ignore 'Different root nodes' error: END
      if (loadErrors.length > 0) {
        $ionicPopup.alert({template: "loadErrors: " + loadErrors.join(",")});
      }
    });
  }

  /**
   * launch the survey as modal
   * @param {object} scope $scope object
   * @param {string} name survey name
   * @param {{
   *  trip?: object;
   *  disableDismiss?: boolean;
   *  onInit?: Function;
   *  onNext?: Function;
   *  hideBackButton: boolean | undefined;
   *  hideFormFooterNav: boolean | undefined;
   * }} [opts] survey launch options 
   * @returns 
   */
  function launch(scope, name, opts) {
    _resetState();
    _state.scope = scope;
    _state.name = name;
    Object.assign(_state.opts, opts);
    return new Promise(function(resolve, reject) {
      $ionicModal.fromTemplateUrl('templates/survey/enketo/modal.html', { scope })
        .then(modal => {
          _state.modal = modal;
          _state.scope.enketoSurvey = {
            // embed functions to make it available for the template to execute them
            disableDismiss: _state.opts.disableDismiss,
            validateAndSave,
            onNext: _state.opts.onNext,
            hide: (result = false) => { _state.modal.hide(); resolve(result); },
          }
          initSurvey(name, opts).catch(e => console.trace(e));
          _state.modal.show();
          _state.opts.onInit();
        });
    });
  }

  function validateAndSave() {
    return EnketoSurvey.validateAndSave()
    .then(result => {
      if (!result) {
        $ionicPopup.alert({template: 'Form contains errors. Please see fields marked in red.'});
      } else {
        _state.scope.enketoSurvey.hide(result);
        return;
      }
    });
  }

  return { initSurvey, launch };
});
