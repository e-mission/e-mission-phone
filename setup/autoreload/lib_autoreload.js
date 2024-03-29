/*!
 * Module dependencies.
 */

var chokidar = require('chokidar'),
    path = require('path'),
    useragent = require('./ext/useragent');

/**
 * AutoReload Middleware.
 *
 * Watches the file system for changes and notifies client.
 *
 * Options:
 *
 *   - `options` {Object}
 *     - `options.autoreload` {Boolean} to enable the middleware (default: true)
 */

module.exports = function(options) {
    var browserToggle = false,
        devicesConnected = [],
        lastModified = Date.now(),
        watches = [ path.join(process.cwd(), 'www/**/*') ];

    // optional options parameter
    options = options || {};
    if (typeof options.autoreload !== 'boolean')
        options.autoreload = true;

    // enable AutoReload
    if (options.autoreload) {
        var watch = chokidar.watch(watches, {
            ignored: [ /[\/\\]\./, path.join(process.cwd(), 'www/js/**/*') ],
            ignoreInitial: true,
            persistent: true
        });

        // exposing watch to browser middleware
        options.watch = watch;

        watch.on('error', function(e) {
            if (options.emitter) {
                options.emitter.emit('error', e);
            }
        });

        // flag as outdated on all local file system changes
        watch.on('all', function(event, filepath) {
            lastModified = Date.now();

            options.filesToUpdate.push([Date.now(), filepath]);

            if (options.emitter) {
                options.emitter.emit('log', 'file changed', filepath);
            }
        });

        // stop watching when the server shutsdown
        options.emitter.on('close', function() {
            watch.close();
        });

        options.emitter.on('browserPrepare', function() {
            browserToggle = true;
        });
    }

    // the app constantly polls the server checking for the outdated state
    // if the app detects the outdated state to be true, it will force a reload on the page
    return function(req, res, next) {
        // console.log("All headers"+JSON.stringify(req.headers));
        var cookieHeader = req.headers["cors-cookie"];
        console.log("Got cookie header "+cookieHeader);
        if (cookieHeader == undefined || cookieHeader == "null") {
            // console.log("Undefined cookie, setting session to blank");
            req.session = {}
        } else {
            // console.log("Found cookie setting session to non-blank");
            req.session = JSON.parse(cookieHeader);
        }
        if (req.url.indexOf('/__api__/autoreload') === 0) {
            if (req.method === 'GET') {
                // by default, lastUpdated is undefined.
                // on the first non-autoreload request, it is timestamped.
                // when the first request is to autoreload, we timestamp
                // it to 0 because no content has ever been retrieved,
                // which means that the content on the device is out-of-date.
                // console.log("In GET method handler, lastUpdated = "+req.session.lastUpdated);
                if (!req.session.lastUpdated) {
                    req.session.lastUpdated = 0;
                }
            }
            else if (req.method === 'POST') {
                // console.log("In POST method handler, lastUpdated = "+req.session.lastUpdated);
                req.session.lastUpdated = Date.now();
            }

            if (browserToggle && useragent.parse(req.headers['user-agent']).platform === 'browser') {
                req.session.lastUpdated = 0;
                browserToggle = false;
            }

            // track new devices as they connect for analytics
            if (req.sessionID) {
                var sessionID = req.sessionID;
                if (sessionID && !devicesConnected[sessionID]) {
                    devicesConnected[sessionID] = true;
                    options.emitter.emit('deviceConnected');
                }
            }

            var resHeaders = {};
            resHeaders['Content-Type'] = 'text/json';
            if (req.session.lastUpdated > 0) {
                resHeaders['Set-CORS-Cookie'] = JSON.stringify(req.session)
            }

            res.writeHead(200, resHeaders);

            res.end(JSON.stringify({
                content: {
                    lastModified: lastModified,
                    lastUpdated: req.session.lastUpdated,
                    outdated: (lastModified > req.session.lastUpdated)
                },
                projectChanged: (options.appID !== require('url').parse(req.url, true).query.appID)
            }));
        }
        else {
            // when lastUpdated is undefined, set it as up-to-date
            // since a legit resource request is going through
            if (!req.session.lastUpdated) {
                req.session.lastUpdated = Date.now();
            }
            next();
        }
    };
};
