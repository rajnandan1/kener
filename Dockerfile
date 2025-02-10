# syntax=docker/dockerfile:1

# Global build arguments
ARG ALPINE_VERSION=23.7.0-alpine3.21
ARG DEBIAN_VERSION=23.7.0-bookworm-slim
ARG VARIANT=debian

#==========================================================#
#                   STAGE 1: BUILD STAGE                    #
#==========================================================#

FROM node:${DEBIAN_VERSION} AS builder-debian
RUN apt-get update && apt-get install --no-install-recommends -y \
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
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        build-base \
        python3 \
        py3-pip \
        make \
        g++ \
        sqlite \
        sqlite-dev \
        tzdata \
        iputils && \
    rm -rf /var/cache/apk/*

FROM builder-${VARIANT} AS builder

# Set environment variables
ENV NPM_CONFIG_LOGLEVEL=error \
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
    chmod -R 750 uploads database

# Build the application and remove `devDependencies`
RUN npm run build && \
    npm prune --omit=dev

#==========================================================#
#             STAGE 2: PRODUCTION/FINAL STAGE              #
#==========================================================#

FROM node:${DEBIAN_VERSION} AS final-debian
RUN apt-get update && apt-get install --no-install-recommends -y \
        iputils-ping \
        sqlite3 \
        tzdata \
        wget && \
    rm -rf /var/lib/apt/lists/*

FROM node:${ALPINE_VERSION} AS final-alpine
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
        iputils \
        sqlite \
        tzdata && \
    rm -rf /var/cache/apk/*

FROM final-${VARIANT} AS final

ARG PORT=3000 \
    USERNAME=node

# Set environment variables
ENV HEALTHCHECK_PORT=$PORT \
    HEALTHCHECK_PATH= \
    NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=error \
    PORT=$PORT \
    TZ=Etc/UTC

# Set the working directory
WORKDIR /app

# Copy package files build artifacts, and necessary files from builder stage
COPY --chown=node:node --from=builder /app/src/lib/ ./src/lib/
COPY --chown=node:node --from=builder /app/build ./build
COPY --chown=node:node --from=builder /app/uploads ./uploads
COPY --chown=node:node --from=builder /app/database ./database
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/migrations ./migrations
COPY --chown=node:node --from=builder /app/seeds ./seeds
COPY --chown=node:node --from=builder /app/static ./static
COPY --chown=node:node --from=builder /app/entrypoint.sh ./entrypoint.sh
COPY --chown=node:node --from=builder /app/knexfile.js ./knexfile.js
COPY --chown=node:node --from=builder /app/main.js ./main.js
COPY --chown=node:node --from=builder /app/openapi.json ./openapi.json
COPY --chown=node:node --from=builder /app/openapi.yaml ./openapi.yaml

# Ensure necessary directories are writable
VOLUME ["/uploads", "/database"]

# Set container timezone and make entrypoint script executable
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone && \
    chmod +x ./entrypoint.sh

# Expose the application port
EXPOSE $PORT

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --quiet --spider http://localhost:$HEALTHCHECK_PORT$HEALTHCHECK_PATH || exit 1

# Use a non-root user (recommended for security)
USER $USERNAME

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "main"]