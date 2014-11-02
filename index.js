var Hunt = require('hunt'),
  request = require('request');

var hunt = Hunt({
  'io': true,
  'public': __dirname + '/public/',
  'views': __dirname + '/views/'
});

hunt
  .extendModel('Weather', function (core) {
    var WeatherSchema = new core.mongoose.Schema({
      'dts': Date,
      'temp': Number,
      'pressure': Number,
      'humidity': Number
    });

    WeatherSchema.index({
      dts: 1
    });

    WeatherSchema.post('save', function (doc) {
      core.emit('broadcast', {'newWeather': doc});
    });
//this step is very important - bind mongoose model to current mongo database connection
// and assign it to collection in mongo database
    return core.mongoConnection.model('Weather', WeatherSchema);
  })
  .extendApp(function (core) {
    core.app.locals.css.push({'href': '//yandex.st/bootstrap/3.1.1/css/bootstrap.min.css', 'media': 'screen'});
    core.app.locals.javascripts.push({'url': '//yandex.st/jquery/2.0.3/jquery.min.js'});
    core.app.locals.javascripts.push({'url': '//yandex.st/bootstrap/3.1.1/js/bootstrap.min.js'});
    core.app.locals.javascripts.push({'url': '//cdnjs.cloudflare.com/ajax/libs/async/0.9.0/async.js'});
    core.app.locals.javascripts.push({'url': '//ajax.googleapis.com/ajax/libs/angularjs/1.2.23/angular.min.js'});
    core.app.locals.javascripts.push({'url': '//ajax.googleapis.com/ajax/libs/angularjs/1.2.23/angular-route.min.js'});
    core.app.locals.javascripts.push({'url': '//ajax.googleapis.com/ajax/libs/angularjs/1.2.23/angular-resource.min.js'});
    core.app.locals.delimiters = '[[ ]]';
    core.app.locals.javascripts.push({'url': '/script.js'});
  })
  .extendController('/', function (core, router) {

    router.get('/', function (req, res) {
      res.render('index', {'title': 'Weather in Moscow'});
    });

    router.get('/api/v1/weather', function (req, res) {
      var ago = new Date(Date.now() - 24 * 60 * 60);
      req.model.Weather
        .find({"dts": {$gt: ago, $lt: new Date()}})
        .sort('-dts')
        .limit(100)
        .exec(function (error, data) {
          if (error) {
            throw error;
          } else {
            res.json(data);
          }
        });
    });
  });

if (hunt.startCluster({'web': 2})) {
//this is pacemaker process, that restarts child process on fails
} else {
//this is child process, that does the things
  setInterval(function () {
    hunt.emit('broadcast', {'dts': new Date().toLocaleTimeString()})
  }, 500);

  hunt.async.forever(function (next) {
    request({
      'method': 'GET',
      'json': true,
      'url': 'http://api.openweathermap.org/data/2.5/weather?q=Moscow'
    }, function (error, response, body) {
      if (error) {
        next(error)
      } else {
        if (response.statusCode === 200) {
          hunt.model.Weather.create({
            'dts': new Date(),
            'temp': body.main.temp,
            'pressure': body.main.pressure,
            'humidity': body.main.humidity
          }, function (error, weatherRecordCreated) {
            if (error) {
              next(error);
            } else {
              console.log(weatherRecordCreated);
              setTimeout(next, 5000);
            }
          });
        } else {
          setTimeout(next, 5000);
        }
      }
    });
  }, function (error) {
    if (error) {
      console.error(error);
    }
  });
}