FROM node:15.14

RUN git clone --recursive https://github.com/Hiro-Nakamura/ab_service_<%= name %>.git app && cd app && npm install

WORKDIR /app

CMD [ "node", "--inspect=0.0.0.0:9229", "app.js" ]
