# axios // adapters

## “adapters/”下的模块处理发送请求，并在收到响应后处理返回的“Promise”。
The modules under `adapters/` are modules that handle dispatching a request and settling a returned `Promise` once a response is received.

## Example

```js
var settle = require('./../core/settle');

module.exports = function myAdapter(config) {
  // At this point:
  //  - config has been merged with defaults
  //  - request transformers have already run
  //  - request interceptors have already run
  
  // Make the request using config provided
  // Upon response settle the Promise

  return new Promise(function(resolve, reject) {
  
    var response = {
      data: responseData,
      status: request.status,
      statusText: request.statusText,
      headers: responseHeaders,
      config: config,
      request: request
    };

    settle(resolve, reject, response);

    // From here:
    //  - response transformers will run
    //  - response interceptors will run
  });
}
```
