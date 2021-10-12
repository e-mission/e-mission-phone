angular.module('emission.splash.referral', ['emission.plugin.kvstore'])

.factory('ReferralHandler', function($window, KVStore) {
    var referralHandler = {};

    var REFERRAL_NAVIGATION_KEY = 'referral_navigation';
    var REFERRED_KEY = 'referred';
    var REFERRED_GROUP_ID = 'referred_group_id';
    var REFERRED_USER_ID = 'referred_user_id';

    referralHandler.getReferralNavigation = function() {
      toReturn = KVStore.getDirect(REFERRAL_NAVIGATION_KEY);
      KVStore.remove(REFERRAL_NAVIGATION_KEY);
      return toReturn;
    }

    referralHandler.setupGroupReferral = function(kvList) {
        KVStore.set(REFERRED_KEY, true);
        KVStore.set(REFERRED_GROUP_ID, kvList['groupid']);
        KVStore.set(REFERRED_USER_ID, kvList['userid']);
        KVStore.set(REFERRAL_NAVIGATION_KEY, 'goals');
   };

   referralHandler.clearGroupReferral = function(kvList) {
        KVStore.remove(REFERRED_KEY);
        KVStore.remove(REFERRED_GROUP_ID);
        KVStore.remove(REFERRED_USER_ID);
        KVStore.remove(REFERRAL_NAVIGATION_KEY);
   };

   referralHandler.getReferralParams = function(kvList) {
        return [KVStore.getDirect(REFERRED_GROUP_ID),
                KVStore.getDirect(REFERRED_USER_ID)];
   }

   referralHandler.hasPendingRegistration = function() {
       return KVStore.getDirect(REFERRED_KEY)
   };

   return referralHandler;
});
