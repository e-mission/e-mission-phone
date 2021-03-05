'use strict';

angular.module('emission.i18n.utils', [])
.factory("i18nUtils", function($http, $translate, Logger) {
  var iu = {};
  // copy-pasted from ngCordova, and updated to promises
  iu.checkFile = function(fn) {
    return new Promise(function(resolve, reject) {
      if ((/^\//.test(fn))) {
        reject('directory cannot start with \/');
      }

      return $http.get(fn);
    });
  }

  // The language comes in between the first and second part
  // the default path should end with a "/"
  iu.geti18nFileName = function (defaultPath, fpFirstPart, fpSecondPart) {
    const lang = $translate.use();
    const i18nPath = "i18n/";
    var defaultVal = defaultPath + fpFirstPart + fpSecondPart;
    if (lang != 'en') {
      var url = i18nPath + fpFirstPart + "-" + lang + fpSecondPart;
      return $http.get(url).then( function(result){
        window.Logger.log(window.Logger.LEVEL_DEBUG,
          "Successfully found the "+url+", result is " + JSON.stringify(result.data).substring(0,10));
        return url;
      }).catch(function (err) {
        window.Logger.log(window.Logger.LEVEL_DEBUG,
          url+" file not found, loading english version, error is " + JSON.stringify(err));
        return Promise.resolve(defaultVal);
      });
    }
    return Promise.resolve(defaultVal);
  }
  return iu;
});
