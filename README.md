# railway-xai-proxy

给阿里云上的 `personalwebsite` 提供一个走 Railway HTTPS 域名的 `xAI` 中继服务。

## 这版为什么改成 HTTPS 中继

之前的 `TCP Proxy + HTTP CONNECT` 方案里，阿里云到 Railway 这一段仍然会透传 `xAI` 的 TLS 握手，容易在链路中被 reset。  
现在改成：

- 阿里云只请求 Railway 的 `HTTPS` 域名
- Railway 服务端再去请求官方 `xAI`

这样阿里云侧不会直接暴露 `api.x.ai`。

## Railway 需要的变量

```env
RELAY_TOKEN=自己定义一串足够长的随机字符串
UPSTREAM_BASE_URL=https://api.x.ai
```

如果后面要切区域入口，也可以改成：

```env
UPSTREAM_BASE_URL=https://us-east-1.api.x.ai
```

## 部署后怎么接阿里云

假设 Railway 对外域名是：

```text
https://your-relay.up.railway.app
```

而你的 `RELAY_TOKEN` 是：

```text
abc123xyz
```

那么阿里云 `.env.production` 里把：

```env
XAI_BASE_URL=https://your-relay.up.railway.app/abc123xyz
```

这样应用发出的：

- `GET /v1/models`
- `POST /v1/responses`

都会先到 Railway，再由 Railway 转发给官方 `xAI`。

## 验证

```bash
curl -i https://your-relay.up.railway.app/abc123xyz/health
curl -i https://your-relay.up.railway.app/abc123xyz/v1/models
```

第一条应返回健康状态。  
第二条如果没带 `Authorization`，通常会返回官方的 `401`，这说明链路已经通了。
