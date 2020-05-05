FROM node:12-alpine

# Create the client builder
WORKDIR /app
COPY ./package*.json ./
RUN npm install --production
COPY . .

EXPOSE 3000
CMD [ "npm", "run", "start" ]
