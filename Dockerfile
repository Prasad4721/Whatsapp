FROM node:20-bullseye-slim

# Install necessary libraries for Puppeteer/Chromium to run whatsapp-web.js
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && apt-get install -y \
      fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
      libxss1 libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \
      libasound2 libxkbcommon0 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
