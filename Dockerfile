FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# ติดตั้ง ping, เครื่องมือเครือข่าย, และ tzdata สำหรับ timezone
RUN apk add --no-cache iputils iproute2 tzdata

RUN npm install

COPY . .

# รับค่า Environment Variables สำหรับการ build และ runtime
ARG TARGET_IP
ARG TARGET_MAC
ARG DOWNTIME_THRESHOLD_MIN
ARG CHECK_INTERVAL_SEC
ARG SKIP_START_HOUR
ARG SKIP_END_HOUR
ARG TIMEZONE=Asia/Bangkok
ARG TELEGRAM_BOT_TOKEN
ARG TELEGRAM_CHAT_ID

ENV TARGET_IP=${TARGET_IP}
ENV TARGET_MAC=${TARGET_MAC}
ENV DOWNTIME_THRESHOLD_MIN=${DOWNTIME_THRESHOLD_MIN}
ENV CHECK_INTERVAL_SEC=${CHECK_INTERVAL_SEC}
ENV SKIP_START_HOUR=${SKIP_START_HOUR}
ENV SKIP_END_HOUR=${SKIP_END_HOUR}
ENV TIMEZONE=${TIMEZONE}
ENV TZ=${TIMEZONE}
ENV TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
ENV TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

CMD ["node", "monitor.js"]
