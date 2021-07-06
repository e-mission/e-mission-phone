/*!
 * Module dependencies.
 */

/**
 * No-Cache Middlware.
 *
 * Prevent caching on all responses.
 */

module.exports = function() {
    return function(req, res, next) {
        res.setHeader('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, CORS-Cookie');
        res.setHeader('Access-Control-Expose-Headers', 'Set-CORS-Cookie');
        next();
    };
};
