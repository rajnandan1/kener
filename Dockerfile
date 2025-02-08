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
    tzdata \
	iputils-ping && \
    rm -rf /var/lib/apt/lists/*

# Set the timezone environment variable and the application environment
ARG KENER_BASE_PATH=
ENV TZ=Etc/UTC
ENV KENER_BASE_PATH=${KENER_BASE_PATH}

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy the rest of the application code
COPY . .

# remove dir src/routes/(docs)
RUN rm -rf src/routes/\(docs\)

# Ensure /app/uploads and /app/database have rw permissions
RUN mkdir -p /app/uploads /app/database && \
    chmod -R 777 /app/uploads /app/database

# Build the application
RUN npm run build

# Argument for the port
ARG PORT=3000
# Set the environment variable for the port
ENV PORT=$PORT

# Expose the application port
EXPOSE $PORT

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "main"]