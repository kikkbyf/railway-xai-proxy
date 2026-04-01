FROM ubuntu:24.04

# 安装 Squid 与密码文件工具，构建一个最小可部署的 HTTP 代理服务。
RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y squid apache2-utils \
  && rm -rf /var/lib/apt/lists/*

COPY squid.conf /etc/squid/squid.conf
COPY start.sh /start.sh

RUN chmod +x /start.sh

EXPOSE 3128

CMD ["/start.sh"]
