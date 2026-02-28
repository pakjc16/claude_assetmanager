FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3100

ENTRYPOINT ["/entrypoint.sh"]
