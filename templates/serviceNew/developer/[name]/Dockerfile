FROM node:11.4.0

RUN git clone https://github.com/Hiro-Nakamura/ab_service_<%= name %>.git app && cd app && yarn install

WORKDIR /app

CMD ["node", "--inspect", "app.js"]
