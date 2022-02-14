FROM node:16-buster-slim

RUN apt-get update && apt-get install -y libusb-dev libudev-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock /app/
RUN yarn install --frozen-lockfile

COPY . /app/
ARG SENTRY_AUTH_TOKEN
RUN yarn netlify-sass
RUN yarn build


FROM nginx:1.21

COPY config.js.template /etc/nginx/templates/config.js.template
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=0 /app/build /usr/share/nginx/html

ENV NGINX_ENVSUBST_OUTPUT_DIR /usr/share/nginx/html
