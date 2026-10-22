FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends fonts-liberation ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY assets ./assets
USER node
CMD ["node", "src/run.js"]
