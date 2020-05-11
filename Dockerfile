FROM node:12-alpine AS builder
RUN apk add python make gcc g++
COPY ./package*.json ./
RUN npm install --production


FROM node:12-alpine AS base
# Create the client builder
WORKDIR /app
COPY . .
COPY --from=builder node_modules .

EXPOSE 4000
CMD [ "npm", "run", "start" ]
