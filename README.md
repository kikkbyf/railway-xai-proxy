# railway-xai-proxy

给阿里云上的 `personalwebsite` 提供一个可访问 `xAI` 的 HTTP 中转代理。

## 你要做的 4 步

1. 新建一个 Git 仓库，把这个目录推上去。
2. 在 Railway 新建服务并部署这个仓库。
3. 在 Railway 环境变量里填写：

```env
PROXY_USER=自己定义一个用户名
PROXY_PASS=自己定义一个强密码
ALLOW_IPS=8.133.197.152
```

如果以后有第二台来源机器，可以写成：

```env
ALLOW_IPS=8.133.197.152,1.2.3.4
```

4. 在 Railway 打开 `TCP Proxy`，记下分配给你的：
   - `host`
   - `port`

## 阿里云后续要接的变量

拿到 Railway 的 `host:port` 后，线上 `.env.production` 里会接成：

```env
HTTP_PROXY=http://PROXY_USER:PROXY_PASS@your-railway-host:your-railway-port
HTTPS_PROXY=http://PROXY_USER:PROXY_PASS@your-railway-host:your-railway-port
NO_PROXY=127.0.0.1,localhost,personalwebsite,nginx,nginx_proxy
```

## 验证目标

接入后，阿里云服务器上应该能通过代理访问：

```bash
curl -I -x http://PROXY_USER:PROXY_PASS@your-railway-host:your-railway-port https://api.x.ai/v1/models
```

如果这条通了，再把代理变量注入 `personalwebsite` 容器，`xAI` 的：

- 模型动态加载
- 实际聊天对话

就都能恢复。
