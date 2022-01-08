# axios // core

# 在' core/ '中找到的模块应该是特定于axios领域逻辑的模块。
# 在axios模块之外使用这些模块很可能没有意义，因为它们的逻辑太具体了。一些核心模块的例子如下:

- Dispatching requests 发送请求
  - Requests sent via `adapters/` (see lib/adapters/README.md)  通过 适配器 发送请求
- Managing interceptors   管理拦截器
- Handling config  处理配置
