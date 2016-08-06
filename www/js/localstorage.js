'user strick';

angular.module('emission.main.localstorage',['angularLocalStorage'])

.factory('UserCalorieData', function(storage) {
	var ucd = {}
	ucd.set = function(info) {
		for(key in info){
			storage.set(key, info[key])
		}
	}

	ucd.get = function() {
		userData = {
			'gender': storage.get('gender'),
	        'heightUnit': storage.get('heightUnit'),
	        'height': storage.get('height'),
	        'weightUnit': storage.get('weightUnit'),
	        'weight': storage.get('weight'),
	        'age': storage.get('age'),
	        'userDataSaved': storage.get('userDataSaved')
	    }
	    return userData;
	}

	ucd.delete = function() {
		storage.remove('gender');
        storage.remove('height');
        storage.remove('heightUnit');
        storage.remove('weight');
        storage.remove('weightUnit');
        storage.remove('age');
        storage.remove('userDataSaved');
	}
	return ucd;
})