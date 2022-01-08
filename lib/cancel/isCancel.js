'use strict';

module.exports = function isCancel(value) {
  // ！！ 转换 真正的boolean值
  return !!(value && value.__CANCEL__);
};
