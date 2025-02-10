# syntax=docker/dockerfile:1

# Global build arguments
ARG ALPINE_VERSION=23.7.0-alpine3.21
ARG DEBIAN_VERSION=23.7.0-bookworm-slim
ARG VARIANT=debian

#==========================================================#
#                   STAGE 1: BUILD STAGE                    #
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

# TODO: Reevaluate permissions (possibly reduce?)...
# Remove docs directory and ensure required directories exist
RUN rm -rf src/routes/\(docs\) && \
    mkdir -p uploads database && \
	# TODO: Consider changing below to `chmod -R u-rwX,g=rX,o= uploads database`
    chmod -R 750 uploads database

# Build the application and remove `devDependencies`
RUN npm run build && \
    npm prune --omit=dev

#==========================================================#
#             STAGE 2: PRODUCTION/FINAL STAGE              #
#==========================================================#

FROM node:${DEBIAN_VERSION} AS final-debian
# TODO: Confirm with @rajnandan1 which of these packages are necessary for the Debian (default), final stage
RUN apt-get update && apt-get install --no-install-recommends -y \
        iputils-ping=3:20221126-1+deb12u1 \
        sqlite3=3.40.1-2+deb12u1 \
        tzdata=2024b-0+deb12u1 \
        wget=1.21.3-1+b1 && \
    rm -rf /var/lib/apt/lists/*

FROM node:${ALPINE_VERSION} AS final-alpine
# TODO: Confirm with @rajnandan1 which of these packages are necessary for the Alpine Linux, final stage
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

# TODO: Confirm with @rajnandan1 which files/directories are absolutely necessary for production build
# Copy package files build artifacts, and necessary files from builder stage
COPY --chown=node:node --from=builder /app/src/lib/ ./src/lib/
COPY --chown=node:node --from=builder /app/build ./build
COPY --chown=node:node --from=builder /app/uploads ./uploads
COPY --chown=node:node --from=builder /app/database ./database
# TODO: Consider changing from copying `node_modules` to instead letting `npm ci --omit=dev` handle production dependencies. Right now, copying `node_modules` is leading to a smaller image, whereas letting `npm ci` handle the install in final image is slightly faster, but leads to larger image size. IMO, having a slightly longer build time (e.g. ~10 sec.) is better in the end to have a smaller image.
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
	# TODO: To improve security, consider dropping unnecessary capabilities instead of granting image all network capabilities of host. (Maybe `setcap cap_net_raw+p /usr/bin/ping`, etc.) Could also drop all and then grant only the capabilities that are explicitly needed. Some examples are commented out below...
	# setcap cap_net_bind_service=+ep /usr/local/bin/node
	# setcap cap_net_bind_service=+ep /usr/bin/ping
	# setcap cap_net_bind_service=+ep /usr/bin/ping6
	# setcap cap_net_bind_service=+ep /usr/bin/tracepath
	# setcap cap_net_bind_service=+ep /usr/bin/clockdiff

# Expose the application port
EXPOSE $PORT

# TODO: Consider switching to lighter-weight `nc` (Netcat) command-line utility (would remove `wget` in Debian build, however, it's already pretty small, so probably doesn't matter as `wget` is more powerful)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --quiet --spider http://localhost:$HEALTHCHECK_PORT$HEALTHCHECK_PATH || exit 1

# TODO: Revisit letting user define $PUID & $PGID overrides (e.g. `addgroup -g $PGID newgroup && adduser -D -G newgroup -u $PUID node`) as well as potentially ensure no root user exists. (Make sure no processes are running as root, first!)
# Use a non-root user (recommended for security)
USER $USERNAME

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "main"]