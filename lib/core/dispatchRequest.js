'use strict';

/**
 * 分发请求这里做的一件事情就是：
 *      通过将配置config 做变换 最终通过适配器promise 得到 response
 */

var utils = require('./../utils');
// 转换 请求或响应 的数据
var transformData = require('./transformData');
// 是否取消 Boolean
var isCancel = require('../cancel/isCancel');
// 默认参数
var defaults = require('../defaults');
// 取消 信息
var Cancel = require('../cancel/Cancel');

/**
 * 如果请求取消，则抛出“取消”
 * Throws a `Cancel` if cancellation has been requested.
 * config 请求配置
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new Cancel('canceled');
  }
}

/**
 * 使用配置的适配器分发请求
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
module.exports = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers  配置公共部分 配置方法 配置头部
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  // ？？
  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(
    // 成功
    function onAdapterResolution(response) {
      throwIfCancellationRequested(config);

      // Transform response data
      response.data = transformData.call(
        config,
        response.data,
        response.headers,
        config.transformResponse
      );

      return response;
    },
    // 失败
    function onAdapterRejection(reason) {
      if (!isCancel(reason)) {
        throwIfCancellationRequested(config);

        // Transform response data
        if (reason && reason.response) {
          reason.response.data = transformData.call(
            config,
            reason.response.data,
            reason.response.headers,
            config.transformResponse
          );
        }
      }

      return Promise.reject(reason);
    }
  );
};
