FROM node:18-bullseye-slim

# Install Chromium and dependencies
RUN apt-get update \
    && apt-get install -y chromium \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Use the system chromium in puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
