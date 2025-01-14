FROM node:23

# Install necessary packages including tzdata for timezone setting
RUN apt-get update && apt-get install -y \
    build-essential \
    libnode108 \
    nodejs \
    python3 \
    sqlite3 \
    libsqlite3-dev \
    make \
    node-gyp \
    g++ \
    tzdata && \
    rm -rf /var/lib/apt/lists/*

# Set the timezone environment variable
ENV TZ=Etc/UTC

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build


# Set the command to run the application
CMD ["node", "main"]