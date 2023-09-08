FROM node:16.13-alpine

WORKDIR /app

COPY package.json ./

RUN npm install

COPY . ./

CMD [ "npx", "ts-node", "src/index.ts"]