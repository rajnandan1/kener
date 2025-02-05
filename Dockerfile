# syntax=docker/dockerfile:1

# Global build arguments
ARG NODE_ALPINE_VERSION=23-alpine
ARG NODE_DEBIAN_VERSION=23-slim
ARG VARIANT=debian

#==========================================================#
#                   STAGE 1: BUILD STAGE                   #
#==========================================================#

FROM node:${NODE_DEBIAN_VERSION} AS builder-debian
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

FROM node:${NODE_ALPINE_VERSION} AS builder-alpine
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

FROM node:${NODE_DEBIAN_VERSION} AS final-debian
RUN apt-get update && apt-get install -y \
        sqlite3 \
        tzdata \
        iputils-ping && \
    rm -rf /var/lib/apt/lists/*

FROM node:${NODE_ALPINE_VERSION} AS final-alpine
RUN apk add --no-cache sqlite tzdata iputils

FROM final-${VARIANT} AS final

# Set the working directory
WORKDIR /app

# Copy package files and necessary build artifacts from builder stage
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder \
    /app/src/lib/i18n \
    /app/src/lib/locales \
    /app/src/lib/server \
    /app/src/lib/boringOne.js \
    /app/src/lib/clientTools.js \
    /app/src/lib/color.js \
    /app/src/lib/index.js \
    /app/src/lib/site.js \
    ./src/lib/
COPY --from=builder \
    /app/build \
    /app/uploads \
    /app/database \
    /app/node_modules \
    /app/migrations \
    /app/seeds \
    /app/static \
    /app/embed.html \
    /app/knexfile.js \
    /app/main.js \
    /app/openapi.json \
    /app/openapi.yaml \
    /app/sitemap.js.bk \
    /app/utils.js \
    ./

# Set environment variables
ARG PORT=3000
ENV PORT=$PORT \
    NODE_ENV=production

# Expose the application port
EXPOSE $PORT

# Run the application
CMD ["node", "main"]