angular.module('weatherApp', ['ngRoute', 'ngResource'])
  .config(['$routeProvider',
    function ($routeProvider) {
      $routeProvider
        .when('/', {
          templateUrl: '/partials/main.html',
          controller: 'mainController'
        })
        .otherwise({
          redirectTo: '/'
        });
    }])
  .factory('socket', function ($rootScope) {
    var socket = io();
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
    };
  })
  .controller('mainController', ['$scope', '$http', 'socket', function ($scope, $http, socket) {
    $scope.dts = new Date().toLocaleTimeString();
    $scope.weatherRecords = [];
    $http.get('/api/v1/weather')
      .success(function (data, status) {
        data.map(function (r) {
          $scope.weatherRecords.push(r);
        });
      })
      .error(function (data, status) {
        //ok
      });
    socket.on('broadcast', function (payload) {
      console.log(payload);
      if (payload.newWeather) {
        $scope.weatherRecords.push(payload.newWeather);
      }
      if(payload.dts){
        $scope.dts = payload.dts;
      }
    });
  }])
;