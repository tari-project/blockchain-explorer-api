FROM node:18 AS builder
RUN apt-get update && apt-get install -y python3 make gcc g++
WORKDIR /app
COPY ./package*.json ./
RUN npm install --production


FROM node:18-slim AS base
RUN apt-get update && apt-get install -y curl tini
# Create the client builder
WORKDIR /app
COPY . .
COPY --from=builder /app/node_modules/ ./node_modules

EXPOSE 4000
CMD [ "tini", "--", "node", "./bin/www" ]
