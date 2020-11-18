//
// Reload the app if server detects local change
//
(function() {
    var host = 'http://127.0.0.1:3000',
        url = host + '/__api__/autoreload',
        timer;

    function storeCookie(res) {
        // console.log("all headers = "+res.getAllResponseHeaders());
        var cookieHeader = res.getResponseHeader("Set-CORS-Cookie")
        // console.log("cookie header = "+cookieHeader);
        if (cookieHeader != null) {
            window.sessionStorage.setItem("Cookie", cookieHeader);
        }
    }

    function postStatus() {
        // console.log("outdated, sending POST");
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('CORS-Cookie', window.sessionStorage.getItem("Cookie"));
        xhr.onreadystatechange = function() {
            if (this.readyState === 4 && /^[2]/.test(this.status)) {
                storeCookie(this);
            }
        };
        xhr.send();
    }

    function checkForReload() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.setRequestHeader('CORS-Cookie', window.sessionStorage.getItem("Cookie"));
        xhr.onreadystatechange = function() {
            if (this.readyState === 4 && /^[2]/.test(this.status)) {
                storeCookie(this);
                var response = JSON.parse(this.responseText);
                // console.log("response = "+JSON.stringify(response));
                if (response.content.outdated) {
                    postStatus();

                    // this is ensure we don't duplicate a download when we first launch the app on device
                    if(response.content.lastUpdated !== 0) {
                        window.clearTimeout(timer);
                        window.phonegap.app.config.load(function(config) {
                            window.phonegap.app.downloadZip({
                                address: (config.address.match(/^(.*:\/\/)/)) ? config.address : 'http://' + config.address,
                                update: true
                            });
                        });
                    }
                } else if (response.projectChanged) {
                    window.phonegap.app.config.load(function(config) {
                        window.phonegap.app.downloadZip({
                            address: (config.address.match(/^(.*:\/\/)/)) ? config.address : 'http://' + config.address,
                            update: false
                        });
                    });
                }
            }
        };
        xhr.send();
    }

    document.addEventListener("deviceready", function() {
        timer = setInterval(checkForReload, 1000 * 3);
    }, false);
})(window);
