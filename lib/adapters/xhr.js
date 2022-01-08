'use strict';
// 在浏览器里用来发送请求的

var utils = require('./../utils');
// 根据响应状态 resolve 或者 reject promise
var settle = require('./../core/settle');
// 标准浏览器支持cookie
var cookies = require('./../helpers/cookies');
// 连接URL与params
var buildURL = require('./../helpers/buildURL');
// 通过组合baseURL和requestedURL创建一个新的URL
var buildFullPath = require('../core/buildFullPath');
// 头部解析为对象
var parseHeaders = require('./../helpers/parseHeaders');
// URL是否同源
var isURLSameOrigin = require('./../helpers/isURLSameOrigin');
// 创建Error
var createError = require('../core/createError');
// 默认配置
var defaults = require('../defaults');
// 取消请求
var Cancel = require('../cancel/Cancel');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;
    var responseType = config.responseType;
    var onCanceled;
    function done() {
      /**
       * 取消请求配置
       */
      if (config.cancelToken) {
        config.cancelToken.unsubscribe(onCanceled);
      }

      /**
       * 信号
       */
      if (config.signal) {
        config.signal.removeEventListener('abort', onCanceled);
      }
    }

    /**
     * 是否表单数据
     */
    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    /**
     * XMLHttpRequest API对象 用来在浏览器和服务器端传输数据
     */
    var request = new XMLHttpRequest();

    // HTTP basic authentication 基本认证 姓名，密码，权限
    // open方法 open( Method, URL, Asynchronous, UserName, Password ) 在实际发送请求之前调用，以用来验证请求方法，URL以及用户信息
    // send方法 send(data) XMLHttpRequest对象的send方法用来发送请求
    // abort方法 如果XMLHttpRequest对象的readyState属性还没有变成4，这个方法可以终止请求
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    var fullPath = buildFullPath(config.baseURL, config.url);

    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    function onloadend() {
      if (!request) {
        return;
      }
      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;  // 返回所有的响应头
      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
        request.responseText : request.response;
      // 响应 包括 data status statusText headers config request
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      // 根据响应状态 resolve 或者 reject promise
      settle(function _resolve(value) {
        resolve(value);
        done();
      }, function _reject(err) {
        reject(err);
        done();
      }, response);

      // Clean up request 清除请求
      request = null;
    }

    // loadend事件总是在一个资源的加载进度停止之后被触发
    if ('onloadend' in request) {
      // Use onloadend if available 如果可用，请使用onloadend
      request.onloadend = onloadend;
    } else {
      // Listen for ready state to emulate onloadend
      // XMLHttpRequest.onreadystatechange 会在 XMLHttpRequest 的readyState 属性发生改变时触发 readystatechange 事件的时候被调用。
      request.onreadystatechange = function handleLoad() {
        if (!request || request.readyState !== 4) {
          return;
        }

        /**
         * readyState
         *  0 UNSENT 还没发送
         *  1 OPENED open()已调用
         *  2 HEADERS_RECEIVED send()已调用 头部和状态已经可获得
         *  3 LOADING 下载中 已包含部分数据
         *  4 DONE 完成
         */

        // The request errored out and we didn't get a response, this will be
        // handled by onerror instead
        // With one exception: request that using file: protocol, most browsers
        // will return status as 0 even though it's a successful request
        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
          return;
        }
        // readystate handler is calling before onerror or ontimeout handlers,
        // so we should call onloadend on the next 'tick'
        setTimeout(onloadend);
      };
    }

    // 不是手动取消
    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(createError('Request aborted', config, 'ECONNABORTED', request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors 低级网络错误
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
      var transitional = config.transitional || defaults.transitional;
      if (config.timeoutErrorMessage) {
        timeoutErrorMessage = config.timeoutErrorMessage;
      }
      reject(createError(
        timeoutErrorMessage,
        config,
        transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
        cookies.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (!utils.isUndefined(config.withCredentials)) {
      request.withCredentials = !!config.withCredentials;
    }

    // Add responseType to request if needed
    if (responseType && responseType !== 'json') {
      request.responseType = config.responseType;
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken || config.signal) {
      // Handle cancellation
      // eslint-disable-next-line func-names
      onCanceled = function(cancel) {
        if (!request) {
          return;
        }
        reject(!cancel || (cancel && cancel.type) ? new Cancel('canceled') : cancel);
        request.abort();
        request = null;
      };

      config.cancelToken && config.cancelToken.subscribe(onCanceled);
      if (config.signal) {
        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
      }
    }

    if (!requestData) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};
