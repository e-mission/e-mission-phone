"use strict";

angular
  .module("emission.intro", [
    "emission.splash.startprefs",
    "emission.splash.updatecheck",
    'emission.appstatus.permissioncheck',
    "emission.i18n.utils",
    "ionic-toast",
  ])

  .config(function ($stateProvider) {
    $stateProvider
      // setup an abstract state for the intro directive
      .state("root.intro", {
        url: "/intro",
        templateUrl: "templates/intro/intro.html",
        controller: "IntroCtrl",
      })
      .state("root.reconsent", {
        url: "/reconsent",
        templateUrl: "templates/intro/reconsent.html",
        controller: "IntroCtrl",
      });
  })

  .controller(
    "IntroCtrl",
    function (
      $scope,
      $rootScope,
      $state,
      $window,
      $ionicPlatform,
      $ionicSlideBoxDelegate,
      $ionicPopup,
      $ionicHistory,
      ionicToast,
      $timeout,
      CommHelper,
      StartPrefs,
      SurveyLaunch,
      UpdateCheck,
      $translate,
      i18nUtils
    ) {
      $scope.setupPermissionText = function () {
        $scope.platform = $window.device.platform;
        $scope.osver = $window.device.version.split(".")[0];
        if ($scope.platform.toLowerCase() == "android") {
          if ($scope.osver < 6) {
            $scope.locationPermExplanation = $translate.instant(
              "intro.permissions.locationPermExplanation-android-lt-6"
            );
          } else if ($scope.osver < 10) {
            $scope.locationPermExplanation = $translate.instant(
              "intro.permissions.locationPermExplanation-android-6-9"
            );
          } else if ($scope.osver < 11) {
            $scope.locationPermExplanation = $translate.instant(
              "intro.permissions.locationPermExplanation-android-10"
            );
          } else {
            $scope.locationPermExplanation = $translate.instant(
              "intro.permissions.locationPermExplanation-android-gte-11"
            );
          }
        }

        if ($scope.platform.toLowerCase() == "ios") {
          if ($scope.osver < 13) {
            $scope.locationPermExplanation = $translate.instant(
              "intro.permissions.locationPermExplanation-ios-lt-13"
            );
          } else {
            $scope.locationPermExplanation = $translate.instant(
              "intro.permissions.locationPermExplanation-ios-gte-13"
            );
          }
        }

        $scope.backgroundRestricted = false;
        if ($window.device.manufacturer.toLowerCase() == "samsung") {
          $scope.backgroundRestricted = true;
          $scope.allowBackgroundInstructions = $translate.instant(
            "intro.allow_background.samsung"
          );
        }

        $scope.fitnessPermNeeded =
          $scope.platform.toLowerCase() == "ios" ||
          ($scope.platform.toLowerCase() == "android" && $scope.osver >= 10);

        console.log("Explanation = " + $scope.locationPermExplanation);
      };

      var allIntroFiles = Promise.all([
        i18nUtils.geti18nFileName("templates/", "intro/summary", ".html"),
        i18nUtils.geti18nFileName("templates/", "intro/consent", ".html"),
        i18nUtils.geti18nFileName(
          "templates/",
          "intro/sensor_explanation",
          ".html"
        ),
        i18nUtils.geti18nFileName("templates/", "intro/login", ".html"),
      ]);
      allIntroFiles.then(function (allIntroFilePaths) {
        $scope.$apply(function () {
          console.log("intro files are " + allIntroFilePaths);
          $scope.summaryFile = allIntroFilePaths[0];
          $scope.consentFile = allIntroFilePaths[1];
          $scope.explainFile = allIntroFilePaths[2];
          $scope.loginFile = allIntroFilePaths[3];
        });
      });

      $scope.getIntroBox = function () {
        return $ionicSlideBoxDelegate.$getByHandle("intro-box");
      };

      $scope.stopSliding = function () {
        $scope.getIntroBox().enableSlide(false);
      };

      $scope.showSettings = function () {
        window.cordova.plugins.BEMConnectionSettings.getSettings().then(
          function (settings) {
            var errorMsg = JSON.stringify(settings);
            var alertPopup = $ionicPopup.alert({
              title: "settings",
              template: errorMsg,
            });

            alertPopup.then(function (res) {
              $scope.next();
            });
          },
          function (error) {
            $scope.alertError("getting settings", error);
          }
        );
      };

      $scope.generateRandomToken = function (length) {
        var randomInts = window.crypto.getRandomValues(
          new Uint8Array(length * 2)
        );
        var randomChars = Array.from(randomInts).map((b) =>
          String.fromCharCode(b)
        );
        var randomString = randomChars.join("");
        var validRandomString = window.btoa(randomString).replace(/[+/]/g, "");
        return validRandomString.substring(0, length);
      };

      $scope.disagree = function () {
        $scope.getIntroBox().previous();
      };

      $scope.agree = function () {
        StartPrefs.markConsented().then(function (response) {
          $ionicHistory.clearHistory();
          if ($state.is("root.intro")) {
            $scope.loginNew();
          } else {
            StartPrefs.loadPreferredScreen();
          }
        });
      };

      $scope.startSurvey = function () {
        const frenchForm = {
          userIdElementId: "wpforms-25100-field_14",
          url: "https://fabmobqc.ca/nos-donnees-en-mobilite/ma-mobilite/questionnaire-ma-mobilite/",
        };

        const englishForm = {
          userIdElementId: "wpforms-25278-field_14",
          url: "https://fabmobqc.ca/en/our-mobility-data/my-mobility/my-mobility-questionnaire/",
        };

        const form = ((language) => {
          switch (language) {
            case "fr":
              return frenchForm;
            case "en":
              return englishForm;
            default:
              return englishForm;
          }
        })($translate.use());

        CommHelper.getUser().then(function (userProfile) {
          const fillers = [
            {
              elementId: form.userIdElementId,
              elementValue: userProfile.user_id["$uuid"],
            },
          ];

          SurveyLaunch.startSurveyPrefilled(form.url, fillers);
        });
      };

      $scope.next = function () {
        $scope.getIntroBox().next();
      };

      $scope.previous = function () {
        $scope.getIntroBox().previous();
      };

      $scope.alertError = function (title, errorResult) {
        var errorMsg = JSON.stringify(errorResult);
        var alertPopup = $ionicPopup.alert({
          title: title,
          template: errorMsg,
        });

        alertPopup.then(function (res) {
          window.Logger.log(window.Logger.LEVEL_INFO, errorMsg + " " + res);
        });
      };

      $scope.loginNew = function () {
        $scope.randomToken = $scope.generateRandomToken(16);
        $scope.login($scope.randomToken);
      };

      $scope.login = function (token) {
        window.cordova.plugins.BEMJWTAuth.setPromptedAuthToken(token).then(
          function (userEmail) {
            // ionicToast.show(message, position, stick, time);
            // $scope.next();
            ionicToast.show(userEmail, "middle", false, 2500);
            if (userEmail == "null" || userEmail == "") {
              $scope.alertError("Invalid login " + userEmail);
            } else {
              CommHelper.registerUser(
                function (successResult) {
                  UpdateCheck.getChannel().then(function (retVal) {
                    CommHelper.updateUser({
                      client: retVal,
                    });
                  });
                  $scope.startSurvey();
                  $scope.finish();
                },
                function (errorResult) {
                  $scope.alertError("User registration error", errorResult);
                }
              );
            }
          },
          function (error) {
            $scope.alertError("Sign in error", error);
          }
        );
      };

      // Called each time the slide changes
      $scope.slideChanged = function (index) {
        $scope.slideIndex = index;
        /*
         * The slidebox is created as a child of the HTML page that this controller
         * is associated with, so it is not available when the controller is created.
         * There is an onLoad, but it is for ng-include, not for random divs, apparently.
         * Trying to create a new controller complains because then both the
         * directive and the controller are trying to ask for a new scope.
         * So instead, I turn off swiping after the initial summary is past.
         * Since the summary is not legally binding, it is fine to swipe past it...
         */
        if (index > 0) {
          $scope.getIntroBox().enableSlide(false);
        }
      };

      $scope.finish = function () {
        // this is not a promise, so we don't need to use .then
        StartPrefs.markIntroDone();
        $scope.getIntroBox().slide(0);
        StartPrefs.loadPreferredScreen();
      };

      $ionicPlatform.ready().then(function () {
        $scope.setupPermissionText();
      });
    }
  );
