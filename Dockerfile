# syntax=docker/dockerfile:1

# Global build arguments
ARG ALPINE_VERSION=23-alpine
ARG DEBIAN_VERSION=23-slim
ARG VARIANT=debian

#==========================================================#
#                   STAGE 1: BUILD STAGE                   #
#==========================================================#

FROM node:${DEBIAN_VERSION} AS builder-debian
RUN apt-get update && apt-get install -y \
        build-essential \
        python3 \
        sqlite3 \
        libsqlite3-dev \
        make \
        node-gyp \
        g++ \
        tzdata \
        iputils-ping && \
    rm -rf /var/lib/apt/lists/*

FROM node:${ALPINE_VERSION} AS builder-alpine
RUN apk add --no-cache \
        build-base \
        python3 \
        py3-pip \
        make \
        g++ \
        sqlite \
        sqlite-dev \
        tzdata \
        iputils

FROM builder-${VARIANT} AS builder

# Set timezone and application environment
ARG KENER_BASE_PATH
ENV TZ=Etc/UTC \
    KENER_BASE_PATH=${KENER_BASE_PATH} \
    VITE_BUILD_ENV=production

# Set the working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies, including `devDependencies` (cache enabled for faster builds)
RUN --mount=type=cache,target=/root/.npm \
    npm ci && \
    npm cache clean --force

# Copy application source code
COPY . .

# Remove docs directory and ensure required directories exist
RUN rm -rf src/routes/\(docs\) && \
    mkdir -p uploads database && \
    chmod -R 755 uploads database

# Build the application and remove `devDependencies`
RUN npm run build && \
    npm prune --omit=dev

#==========================================================#
#                STAGE 2: PRODUCTION STAGE                 #
#==========================================================#

FROM node:${DEBIAN_VERSION} AS final-debian
RUN apt-get update && apt-get install -y \
        sqlite3 \
        tzdata \
        iputils-ping && \
    rm -rf /var/lib/apt/lists/*

FROM node:${ALPINE_VERSION} AS final-alpine
RUN apk add --no-cache sqlite tzdata iputils

FROM final-${VARIANT} AS final

# Use a non-root user (recommended for security)
USER node

# Set the working directory
WORKDIR /app

# Copy package files build artifacts, and necessary files from builder stage
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/src/lib/ ./src/lib/
COPY --chown=node:node --from=builder /app/build ./build
COPY --chown=node:node --from=builder /app/uploads ./uploads
COPY --chown=node:node --from=builder /app/database ./database
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/migrations ./migrations
COPY --chown=node:node --from=builder /app/seeds ./seeds
COPY --chown=node:node --from=builder /app/static ./static
COPY --chown=node:node --from=builder /app/embed.html ./embed.html
COPY --chown=node:node --from=builder /app/knexfile.js ./knexfile.js
COPY --chown=node:node --from=builder /app/main.js ./main.js
COPY --chown=node:node --from=builder /app/openapi.json ./openapi.json
COPY --chown=node:node --from=builder /app/openapi.yaml ./openapi.yaml
COPY --chown=node:node --from=builder /app/sitemap.js.bk ./sitemap.js.bk
COPY --chown=node:node --from=builder /app/utils.js ./utils.js

# Set environment variables
ARG PORT=3000
ENV PORT=$PORT \
    NODE_ENV=production

# Expose the application port
EXPOSE $PORT

# Run the application
CMD ["node", "main"]