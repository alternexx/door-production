FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 4000

CMD ["node", "server.js"]
