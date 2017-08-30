angular.module('emission.splash.referral', ['angularLocalStorage'])

.factory('ReferralHandler', function($window, $state, $interval, $rootScope, storage) {
    var referralHandler = {};

    var REFERRAL_NAVIGATION_KEY = 'referral_navigation';
    var REFERRED_KEY = 'referred';
    var REFERRED_GROUP_ID = 'referred_group_id';
    var REFERRED_USER_ID = 'referred_user_id';

    referralHandler.getReferralNavigation = function() {
      toReturn = storage.get(REFERRAL_NAVIGATION_KEY);
      storage.remove(REFERRAL_NAVIGATION_KEY);
      return toReturn;
    }

    referralHandler.setupGroupReferral = function(kvList) {
        storage.set(REFERRED_KEY, true);
        storage.set(REFERRED_GROUP_ID, kvList['groupid']);
        storage.set(REFERRED_USER_ID, kvList['userid']);
        storage.set(REFERRAL_NAVIGATION_KEY, 'goals');
   };

   referralHandler.clearGroupReferral = function(kvList) {
        storage.remove(REFERRED_KEY);
        storage.remove(REFERRED_GROUP_ID);
        storage.remove(REFERRED_USER_ID);
        storage.remove(REFERRAL_NAVIGATION_KEY);
   };

   referralHandler.getReferralParams = function(kvList) {
        return [storage.get(REFERRED_GROUP_ID),
                storage.get(REFERRED_USER_ID)];
   }

   referralHandler.hasPendingRegistration = function() {
       return storage.get(REFERRED_KEY)
   };

   return referralHandler;
});
