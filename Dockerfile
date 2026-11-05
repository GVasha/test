FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends libatomic1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/
COPY server/package.json server/package-lock.json ./server/

RUN npm ci

COPY . .

RUN npm run build --prefix client

ENV NODE_ENV=production
ENV DATABASE_DIR=/tmp/collecta-data
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--experimental-sqlite", "server/src/main.js"]
