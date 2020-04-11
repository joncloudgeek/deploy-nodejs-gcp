# If stated without a specific URL, image names here are from Docker Hub
# For list of tags to choose from, see https://hub.docker.com/_/node
# To view the size of the Docker image, see https://hub.docker.com/_/node?tab=tags, here we are using a lightweight image
FROM node:10-slim

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

# Copy over app code
COPY . .

EXPOSE 8080
CMD [ "node", "app.js" ]