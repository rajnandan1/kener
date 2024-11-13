# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies 
RUN npm install

# Copy project files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Run stage
FROM lsiobase/alpine:3.18

# Set timezone and user
ENV TZ=Etc/GMT \
    PUID=911 \
    PGID=911 \
    NODE_ENV=production \
    PORT=3000

# Install Node.js and npm
RUN echo "**** install build packages ****" && \
    apk add --no-cache \
    nodejs \
    npm && \
    echo "**** cleanup ****" && \
    rm -rf \
    /root/.cache \
    /tmp/*

# Configure timezone
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

WORKDIR /app

# Copy built files from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/main.js ./
COPY --from=builder /app/build.js ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/static ./static
COPY --from=builder /app/database ./database
COPY --from=builder /app/config ./config
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.env ./.env

# Install production dependencies only


	
# Create and configure database directory
RUN mkdir -p /app/database && \
    chown -R $PUID:$PGID /app/database && \
    chmod -R 755 /app/database

# Declare volume for persistence
VOLUME /app/database

# Expose port
EXPOSE $PORT

# Set startup command
CMD ["sh", "-c", "node build.js && (node src/lib/server/startup.js & node main.js & wait)"]