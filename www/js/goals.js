'use strict';

angular.module('emission.main.goals',['emission.services', 'ngSanitize', 'ngAnimate', 'angularLocalStorage'])

/*.config(function($stateProvider, $ionicConfigProvider, $urlRouterProvider) {
  $stateProvider

  .state('root.main.goals.party', {
    url: '/party',
    views: {
      'main-goals': {
        templateUrl: 'templates/goals/party.html',
        controller: 'PartyCtrl'
      }
    }
  });
  })*/


.controller('GoalsCtrl', function(CommHelper, $state, $ionicLoading, $scope, $rootScope, $ionicModal, 
								$window, $http, $ionicGesture, $ionicPopup, $timeout, storage, ReferHelper){
	$scope.goals = [];
	$scope.goal = {};
	$scope.challenges=[];
	var partyId;
	$ionicModal.fromTemplateUrl('templates/goals/goal-modal.html', {
		scope: $scope,
		animation: 'slide-in-up'
	}).then(function(modal) {
		$scope.modal = modal;
	});

	$ionicModal.fromTemplateUrl('templates/goals/party-members.html', {
		scope: $scope,
		animation: 'slide-in-up'
	}).then(function(modal) {
		$scope.partyModal = modal;
	});

	var joinGroupSuccess = function() {
	   var alertPopup = $ionicPopup.alert({
	     title: 'Cool!',
	     template: 'Request has been sent.'
	   });

	   alertPopup.then(function(res) {
	   });
	 };
	var joinGroupFail = function() {
	   var alertPopup = $ionicPopup.alert({
	     title: 'Err!',
	     template: 'Request has not been sent.'
	   });

	   alertPopup.then(function(res) {
	   });
	 };	
    var showNeedRegister = function() {
     var confirmPopup = $ionicPopup.confirm({
       title: 'Join Group',
       template: 'A friend invited you to join a group, but you need to sign up first. (Pressing "Cancel" will reject the invite)'
     });

	    confirmPopup.then(function(res) {
	       if(res) { // to game page
	         console.log('User should register');
	       } else { // do nothing
	         console.log('User decides not to register or join group');
	         storage.remove(REFERED_KEY);
	         storage.remove(REFERED_GROUP_ID);
	       }
	    })
 	};
	var handlePendingRefer = function() {

		var REFERED_KEY = 'refered';
		var REFERED_GROUP_ID = 'refered_group_id';
		if (storage.get('habitica_registered') == true) {
			if (storage.get(REFERED_KEY) == true) {
				var groupid = storage.get(REFERED_GROUP_ID);
				var response = ReferHelper.joinGroup(groupid);
				if (response) {
					joinGroupSuccess();
				} else {
					joinGroupFail();
				}
				storage.remove(REFERED_KEY);
				storage.remove(REFERED_GROUP_ID);
			}
		} else {
			showNeedRegister();
		}

	}

	/*$scope.onGesture = function(gesture) {
    	console.log(gesture);
  	}*/

  	//var element = angular.element(document.querySelector('#todo')); 

	/*$scope.data = {
    	showDelete: false
  	};*/
  	$scope.openPartyModal = function() {
    	$scope.partyModal.show();
  	};
  	$scope.closePartyModal = function() {
  		$scope.goal = {};
    	$scope.partyModal.hide();
  	};  

	$scope.openModal = function() {
    	$scope.modal.show();
  	};
  	$scope.closeModal = function() {
  		$scope.goal = {};
    	$scope.modal.hide();
  	};
	$scope.createGoal = function () {
		$scope.goals.push($scope.goal);
		$scope.goal = {};
		$scope.modal.hide();
	};

	$scope.removeGoal = function(goal) {
		$scope.goals.splice($scope.goals.indexOf(goal), 1);
	};

	$scope.theUser = {};

	$scope.signup = function(){
		console.log($scope.theUser.username);
		var regConfig = {'username': $scope.theUser.username};
		console.log(regConfig);
		$ionicLoading.show({
			template: '<ion-spinner icon="bubbles" class="costume"></ion-spinner>'
		});
		CommHelper.habiticaRegister(regConfig, function(response) {
			console.log("Success!")
			console.log(response);
			storage.set('party_id',response.habitica_group_id);
			storage.set('habitica_registered', true);
			refreshInfo();
		}, function(error) {
			$ionicLoading.hide();
			$ionicPopup.alert({title: "<h4 class='center-align'>Username is Required</h4>",
								okText: "Try Again",
								okType: "button-assertive"});
			console.log("Not signed up");
		});
	};
 

    $ionicLoading.show({
			template: '<ion-spinner icon="bubbles" class="costume"></ion-spinner>'
	});

	var getUserInfo = function(){
		var callOpts = {'method': 'GET', 'method_url': "/api/v3/user",
	                    'method_args': null};

		CommHelper.habiticaProxy(callOpts, function(response){
			$scope.screen = response.success;
			$scope.$apply(function() {
				$scope.profile = response.data;
			});
			console.log("Proxy Sucess");
			$scope.gold = Math.round($scope.profile.stats.gp);
			$scope.hp = Math.round($scope.profile.stats.hp);
			$scope.gem = Math.round($scope.profile.balance);
			$scope.silver = Math.round(($scope.profile.stats.gp - 
				Math.floor($scope.profile.stats.gp))*100);
			if(!('_id' in $scope.profile.party)){
				$scope.hasParty = false;
			} else{
				$scope.hasParty = true;
			}
			if($scope.profile.party.quest.RSVPNeeded==true){
				$scope.hasQuestRequest = true;
			} else{
				$scope.hasQuestRequest = false;
			}
			if('key' in $scope.profile.party.quest){
				if($scope.profile.party.quest.key == null){
					$scope.inQuest = false;
				}else{
					$scope.$apply(function(){
						$scope.monster = $scope.profile.party.quest.key;
					});
					$scope.inQuest = true;
					questContent();
				}
			}
			getParty();
			console.log($scope.profile);
			$ionicLoading.hide();
			}, function(error){
				$ionicLoading.hide();
				console.log("User profile error");
			});
	};

	var getUserTask = function(){
		var callOpts = {'method': 'GET', 'method_url': "/api/v3/tasks/user",
                    'method_args': null};
	    var tasks;
	    CommHelper.habiticaProxy(callOpts, function(response){
			$scope.$apply(function() {
				tasks = response.data;
			});
			$scope.goals = [];
			console.log(tasks);
				for(var habit in tasks){
					if(tasks[habit].type == "habit"){
						$scope.goal.name = tasks[habit].text;
						$scope.goal.note = tasks[habit].notes;
						$scope.goal._id = tasks[habit]._id;
						$scope.createGoal();
					}
				}
			}, function(error){
				console.log("User task error");
		});
	};

    $scope.createGoalPhone = function() {
	   	var callOpts = {'method': 'POST', 'method_url': "/api/v3/tasks/user",
	                    'method_args': {'type': "habit", 'text': $scope.goal.name, 'notes': $scope.goal.note}};

	    CommHelper.habiticaProxy(callOpts, function(response){
	    		$scope.goal._id = response.data._id;
	    		console.log(response.data)
				$scope.createGoal()
				console.log("Sucessfully added the habit");
				$scope.goal = {};
				$scope.modal.hide();
			}, function(error){
				console.log(JSON.stringify(error));
				console.log("error");
			});
	};


	$scope.deleteGoal = function(taskId,  goal) {
		$scope.removeGoal(goal);
	   	var callOpts = {'method': 'DELETE', 'method_url': "/api/v3/tasks/"+taskId,
	                    'method_args': null};

	    CommHelper.habiticaProxy(callOpts, function(response){
				console.log("Sucessfully deleted the habit");
			}, function(error){
				console.log(JSON.stringify(error));
				console.log("error");
			});
	};

	$scope.scoreUp = function(taskId) {
	   	var callOpts = {'method': 'POST', 'method_url': "/api/v3/tasks/"+taskId+"/score/up",
	                    'method_args': null};

	    CommHelper.habiticaProxy(callOpts, function(response){
				getUserInfo();
				console.log("Score up");
			}, function(error){
				console.log(JSON.stringify(error));
				console.log("error");
			});
	};

	$scope.scoreDown = function(taskId) {
	   	var callOpts = {'method': 'POST', 'method_url': "/api/v3/tasks/"+taskId+"/score/down",
	                    'method_args': null};

	    CommHelper.habiticaProxy(callOpts, function(response){
				getUserInfo();
				console.log("Score down");
			}, function(error){
				console.log(JSON.stringify(error));
				console.log("error");
			});
	};

	$scope.joinParty = function() {
	   	var callOpts = {'method': 'POST', 'method_url': "/api/v3/groups/"+partyId+"/join",
	                    'method_args': null};

	    CommHelper.habiticaProxy(callOpts, function(response){
				console.log("Sucessfully joing the party");
				$scope.$apply(function(){
					$scope.hasParty = true;
				});
				getMembers();
				console.log(response);
			}, function(error){
				console.log("Error when joining the party");
			});
	};

	$scope.joinQuest = function() {
	   	var callOpts = {'method': 'POST', 'method_url': "/api/v3/groups/"+partyId+"/quests/accept",
	                    'method_args': null};

	    CommHelper.habiticaProxy(callOpts, function(response){
				console.log("Sucessfully joing the quest");
				$scope.$apply(function(){
					$scope.hasQuestRequest = false;
				});
				console.log(response);
			}, function(error){
				console.log("Error when joining the quest");
			});
	};

	$scope.rejectQuest = function() {
	   	var callOpts = {'method': 'POST', 'method_url': "/api/v3/groups/"+partyId+"/quests/reject",
	                    'method_args': null};

	    CommHelper.habiticaProxy(callOpts, function(response){
				console.log("Sucessfully rejected the quest");
				$scope.$apply(function(){
					$scope.hasQuestRequest = false;
					$scope.inQuest = false;
				});
				console.log(response);
			}, function(error){
				console.log("Error when rejecting the quest");
			});
	};

	var getParty = function() {
		var callOpts = {'method': 'GET', 'method_url': "/api/v3/groups/party",
                    'method_args': null};
    	CommHelper.habiticaProxy(callOpts, function(response){
			console.log("Sucessfully got the party");
			var partyObj = response.data;
			if($scope.inQuest){
				$scope.bossHp = Math.round(partyObj.quest.progress.hp);
				$scope.questActive = partyObj.quest.active;
			}
			$scope.partyName = partyObj.name;
			console.log($scope.inQuest);
			console.log($scope.questActive);
			console.log(response);
		}, function(error){
			console.log("Error when getting the party");
		});
	};

	var questContent = function(){
		var callOpts = {'method': 'GET', 'method_url': "/api/v3/content",
                    'method_args': null};
    	CommHelper.habiticaProxy(callOpts, function(response){
			console.log("Sucessfully got the content");
				var content = response.data;
				console.log(content);
			if($scope.inQuest){
				console.log($scope.monster);
				$scope.bossMaxHealth = content.quests[$scope.monster].boss.hp;
				$scope.bossName = content.quests[$scope.monster].boss.name;
				$scope.questNote = content.quests[$scope.monster].notes;
			}
		}, function(error){
			console.log("Error when getting the content");
		});
	};

    var getMembers = function() {
		var callOpts = {'method': 'GET', 'method_url': "/api/v3/groups/"+partyId+"/members",
					'method_args': null};

    	CommHelper.habiticaProxy(callOpts, function(response){
    		$scope.membersName=[];
			console.log("Sucessfully got the members");
			var members = response.data;
			console.log(response.data);
			members.forEach(function(user){
				$scope.membersName.push(user.profile.name);
			});
		}, function(error){
			console.log("Error when fetching members");
		});
	};

	var bikeChallenge = function() {
		var callOpts = {'method': 'GET', 'method_url': "/api/v3/challenges/8a8134d6-066d-424d-8f3d-0b559c2c1e78",
							'method_args': null};

		    	CommHelper.habiticaProxy(callOpts, function(response){
					console.log("Sucessfully got bike challenge");
					console.log(response);
					$scope.challenges.push(response.data);
				}, function(error){
					console.log("Error when getting bike challenge");
				});
	};

	var carpoolChallenge = function() {
		var callOpts = {'method': 'GET', 'method_url': "/api/v3/challenges/d3e0ee13-8922-47ef-86a0-2c2f662585e1",
							'method_args': null};

		    	CommHelper.habiticaProxy(callOpts, function(response){
					console.log("Sucessfully got carpool challenge");
					console.log(response);
					$scope.challenges.push(response.data);
				}, function(error){
					console.log("Error when getting carpool challenge");
				});
	};

	var publicTransChallenge = function() {
		var callOpts = {'method': 'GET', 'method_url': "/api/v3/challenges/581aea56-8f1f-42fa-ae1c-c6608bc780d5",
							'method_args': null};

		    	CommHelper.habiticaProxy(callOpts, function(response){
					console.log("Sucessfully got public transport challenge");
					console.log(response);
					$scope.challenges.push(response.data);
				}, function(error){
					console.log("Error when getting public transport challenge");
				});
	};

	var getChallenges = function(){
		$scope.challenges=[];
  		bikeChallenge();
		carpoolChallenge();
		publicTransChallenge();
  	};

	$scope.joinChallenge = function(challengeId) {
		var callOpts = {'method': 'POST', 'method_url': "/api/v3/challenges/"+challengeId+"/join",
							'method_args': null};

		    	CommHelper.habiticaProxy(callOpts, function(response){
					console.log("Sucessfully joined the challenge");
					getUserTask();
					console.log(response);
				}, function(error){
					console.log("Error when joining the challenge");
				});
	};

	//Tab switch
	$scope.isActive = false;
  	$scope.activeButton = function() {
  		if($scope.isActiveP == true){
  			$scope.partyButton();
  		}
    	$scope.isActive = !$scope.isActive;
  	};

  	$scope.isActiveP = false;
  	$scope.partyButton = function() {
  		if($scope.isActive == true){
  			$scope.activeButton();
  		}
    	$scope.isActiveP = !$scope.isActiveP;
  	};

  	var refreshInfo = function(){
		console.log("Refreshing information");
		partyId = storage.get('party_id');
		console.log("Party ID = " + storage.get('party_id'));
		getUserInfo();
		handlePendingRefer();
		getMembers();
		getUserTask();
		getChallenges();
		
	};
	
	refreshInfo();

	$scope.refreshPage = function() {
		console.log("Refreshing page");
		refreshInfo();
    };


	/*$http.get('http://54.159.38.241:3000/export/avatar-'+userId+'.html')
    .then(function(response) {
          var html = response.data;
          console.log(html)
          $scope.rawHtml = $sce.trustAsHtml(html);
	}), function(error) {
    	console.log(JSON.stringify(error));
    	console.log(error.data);
	}*/
   	

	/*var UUID= '4f369eef-aed4-4408-bcbf-b34896daf7e3';

	$http.get('https://habitica.com/api/v3/members/'+ UUID)
	.then(function(response){
		$scope.user = response.data;
		//console.log(response.data);
	},function(err){
		$scope.error = err.data;
		console.log($scope.error);
	});
	//function firstUpperCase(string) {
	//	return string[0].toUpperCase() + string.slice(1);
	//}*/
});



