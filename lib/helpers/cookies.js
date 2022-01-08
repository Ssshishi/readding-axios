'use strict';

var utils = require('./../utils');

/**
 * 标准浏览器环境支持document.cookie
 * document.cookie="userId=828; userName=hulk";
 */
module.exports = utils.isStandardBrowserEnv()
  ? // Standard browser envs support document.cookie
  (function standardBrowserEnv() {
    return {
      write: function write(name, value, expires, path, domain, secure) {
        var cookie = [];
        cookie.push(name + '=' + encodeURIComponent(value));

        /**
         * toGMTString 输出格式： Wed, 20 Jul 1983 17:15:00 GMT
         */
        if (utils.isNumber(expires)) {
          cookie.push('expires=' + new Date(expires).toGMTString());
        }

        if (utils.isString(path)) {
          cookie.push('path=' + path);
        }

        if (utils.isString(domain)) {
          cookie.push('domain=' + domain);
        }

        if (secure === true) {
          cookie.push('secure');
        }

        document.cookie = cookie.join('; ');
      },

      read: function read(name) {
        var match = document.cookie.match(
          new RegExp('(^|;\\s*)(' + name + ')=([^;]*)')
        );
        return match ? decodeURIComponent(match[3]) : null;
      },

      remove: function remove(name) {
        this.write(name, '', Date.now() - 86400000);
      }
    };
  })()
  : // 不支持 Non standard browser env (web workers, react-native) lack needed support.
  (function nonStandardBrowserEnv() {
    return {
      write: function write() {},
      read: function read() {
        return null;
      },
      remove: function remove() {}
    };
  })();
