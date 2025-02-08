# syntax=docker/dockerfile:1

# Global build arguments
ARG ALPINE_VERSION=23.7.0-alpine3.21
ARG DEBIAN_VERSION=23.7.0-bookworm-slim
ARG VARIANT=debian

#==========================================================#
#                   STAGE 1: BUILD STAGE                   #
#==========================================================#

FROM node:${DEBIAN_VERSION} AS builder-debian
RUN apt-get update && apt-get install -y \
        build-essential=12.9 \
        python3=3.11.2-1+b1 \
        sqlite3=3.40.1-2+deb12u1 \
        libsqlite3-dev=3.40.1-2+deb12u1 \
        make=4.3-4.1 \
        node-gyp=9.3.0-2 \
        g++=4:12.2.0-3 \
        tzdata=2024b-0+deb12u1 \
        iputils-ping=3:20221126-1+deb12u1 && \
    rm -rf /var/lib/apt/lists/*

FROM node:${ALPINE_VERSION} AS builder-alpine
RUN apk add --no-cache --update \
        build-base=0.5-r3 \
        python3=3.12.9-r0 \
        py3-pip=24.3.1-r0 \
        make=4.4.1-r2 \
        g++=14.2.0-r4 \
        sqlite=3.48.0-r0 \
        sqlite-dev=3.48.0-r0 \
        tzdata=2024b-r1 \
        iputils=20240905-r0

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
#                STAGE 2: PRODUCTION STAGE                 #
#==========================================================#

FROM node:${DEBIAN_VERSION} AS final-debian
RUN apt-get update && apt-get install --no-install-recommends -y \
        iputils-ping=3:20221126-1+deb12u1 \
        sqlite3=3.40.1-2+deb12u1 \
        tzdata=2024b-0+deb12u1 \
        wget=1.21.3-1+b1 && \
    rm -rf /var/lib/apt/lists/*

FROM node:${ALPINE_VERSION} AS final-alpine
RUN apk add --no-cache --update \
    iputils=20240905-r0 \
    sqlite=3.48.0-r0 \
    tzdata=2024b-r1

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
COPY --chown=node:node --from=builder /app/entrypoint.sh ./entrypoint.sh
COPY --chown=node:node --from=builder /app/knexfile.js ./knexfile.js
COPY --chown=node:node --from=builder /app/main.js ./main.js
COPY --chown=node:node --from=builder /app/openapi.json ./openapi.json
COPY --chown=node:node --from=builder /app/openapi.yaml ./openapi.yaml
COPY --chown=node:node --from=builder /app/sitemap.js.bk ./sitemap.js.bk
COPY --chown=node:node --from=builder /app/utils.js ./utils.js

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