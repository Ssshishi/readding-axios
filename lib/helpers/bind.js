'use strict';

/**
 * 返回一个新函数 做深拷贝，利用函数的apply, this指向thisArg, 携带参数数组 args
 */
module.exports = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};
