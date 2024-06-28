# Use the official Node.js 18 image as a base image
FROM node:18.17

# Set the working directory in the container
WORKDIR /app

# Install ffmpeg in the container
RUN apt-get update && apt-get install -y ffmpeg

# Copy the package.json file to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Define the command to run the app 
CMD ["npm", "start" ]

