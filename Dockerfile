# Stage 1: Base image
FROM lsiobase/alpine:3.18 AS build

# Set timezone and user
ENV TZ=Etc/GMT
ENV PUID=911
ENV PGID=911

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

# Set working directory
WORKDIR /app



# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Create database directory
RUN mkdir -p /app/database && \
    chown -R $PUID:$PGID /app/database && \
    chmod -R 755 /app/database

# Set production environment
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Etc/GMT \
    PUID=911 \
    PGID=911
# Copy database contents if they exist
# Declare volume for persistence
VOLUME /app/database


# Build application
RUN node build.js && \
    npm run build

RUN npm install -g vite-node

# Use PORT env variable
EXPOSE $PORT

# Print PORT env variable
RUN echo "PORT: $PORT"

# Set startup command

CMD ["sh", "-c", "vite-node src/lib/server/startup.js & node main.js & wait"]