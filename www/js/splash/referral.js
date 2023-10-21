import angular from 'angular';
import { storageGetDirect, storageRemove, storageSet } from '../plugin/storage';

angular.module('emission.splash.referral', [])

.factory('ReferralHandler', function($window) {
    var referralHandler = {};

    var REFERRAL_NAVIGATION_KEY = 'referral_navigation';
    var REFERRED_KEY = 'referred';
    var REFERRED_GROUP_ID = 'referred_group_id';
    var REFERRED_USER_ID = 'referred_user_id';

    referralHandler.getReferralNavigation = function() {
      const toReturn = storageGetDirect(REFERRAL_NAVIGATION_KEY);
      storageRemove(REFERRAL_NAVIGATION_KEY);
      return toReturn;
    }

    referralHandler.setupGroupReferral = function(kvList) {
        storageSet(REFERRED_KEY, true);
        storageSet(REFERRED_GROUP_ID, kvList['groupid']);
        storageSet(REFERRED_USER_ID, kvList['userid']);
        storageSet(REFERRAL_NAVIGATION_KEY, 'goals');
   };

   referralHandler.clearGroupReferral = function(kvList) {
        storageRemove(REFERRED_KEY);
        storageRemove(REFERRED_GROUP_ID);
        storageRemove(REFERRED_USER_ID);
        storageRemove(REFERRAL_NAVIGATION_KEY);
   };

   referralHandler.getReferralParams = function(kvList) {
        return [storageGetDirect(REFERRED_GROUP_ID),
                storageGetDirect(REFERRED_USER_ID)];
   }

   referralHandler.hasPendingRegistration = function() {
       return storageGetDirect(REFERRED_KEY)
   };

   return referralHandler;
});
