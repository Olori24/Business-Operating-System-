FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY . .

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "apps/api/server.js"]
