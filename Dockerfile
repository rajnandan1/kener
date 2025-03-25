# syntax=docker/dockerfile:1

# Global build arguments (defined default values in case `.env.build` isn't loaded)
ARG ALPINE_VERSION_TAG=23.7.0-alpine3.21
ARG DEBIAN_VERSION_TAG=23.7.0-bookworm-slim
ARG VARIANT=debian

#==========================================================#
#                   STAGE 1: BUILD STAGE                    #
#==========================================================#

FROM node:${DEBIAN_VERSION_TAG} AS builder-debian
RUN apt-get update && apt-get install -y \
        build-essential=12.9 \
        python3=3.11.2-1+b1 \
        sqlite3=3.40.1-2+deb12u1 \
        libsqlite3-dev=3.40.1-2+deb12u1 \
        make=4.3-4.1 \
        node-gyp=9.3.0-2 \
        g++=4:12.2.0-3 \
        tzdata \
        iputils-ping=3:20221126-1+deb12u1 && \
    rm -rf /var/lib/apt/lists/*

FROM node:${ALPINE_VERSION_TAG} AS builder-alpine
RUN apk add --no-cache --update \
        build-base=0.5-r3 \
        python3=3.12.9-r0 \
        py3-pip=24.3.1-r0 \
        make=4.4.1-r2 \
        g++=14.2.0-r4 \
        sqlite=3.48.0-r0 \
        sqlite-dev=3.48.0-r0 \
        tzdata \
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
# TODO: Possibly add `--no-audit` flag to `npm ci` to prevent `npm` from running a security audit on installed packages. (By default, `npm install` performs an audit to check for vulnerabilities in dependencies, which can slow down installation. Adding this flag would skip the audit, thus making `npm install` significantly faster for the CI/CD pipeline.)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-fund && \
    npm cache clean --force

# Copy application source code
COPY . .

# TODO: Reevaluate permissions (possibly reduce?)...
# Remove docs directory and ensure required directories exist
RUN rm -rf src/routes/\(docs\) \
        static/documentation \
        static/fonts/lato/full && \
    mkdir -p uploads database && \
    chmod -R 750 uploads database

# Build the application and remove `devDependencies`
RUN npm run build && \
    npm prune --omit=dev

#==========================================================#
#             STAGE 2: PRODUCTION/FINAL STAGE              #
#==========================================================#

FROM node:${DEBIAN_VERSION_TAG} AS final-debian
# TODO: Consider adding `--no-install-recommends`, but will need testing (may further help reduce final build size)
RUN apt-get update && apt-get install -y \
        iputils-ping=3:20221126-1+deb12u1 \
        sqlite3=3.40.1-2+deb12u1 \
        tzdata \
    # TODO: Is it ok to change to `curl` here so that we don't have to maintain `wget` version mismatch between Debian architectures? (`curl` is only used for the container healthcheck and because there is an Alpine variant (best!) we probably don't care if the Debian image ends up building bigger due to `curl`.)
    curl && \
    rm -rf /var/lib/apt/lists/*

FROM node:${ALPINE_VERSION_TAG} AS final-alpine
RUN apk add --no-cache --update \
	iputils=20240905-r0 \
	sqlite=3.48.0-r0 \
	tzdata

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
COPY --chown=node:node --from=builder /app/package.json ./package.json

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

# Add a healthcheck to the container; `wget` vs. `curl` depending on base image. Using this approach because `wget` does not actually maintain versioning across architectures, so we cannot pin a `wget` version (in above `final-debian` base, `apt-get install`) between differing architectures (e.g. arm64, amd64)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD sh -c 'if [ -f "/etc/alpine-release" ]; then wget --quiet --spider http://localhost:$HEALTHCHECK_PORT$HEALTHCHECK_PATH || exit 1; else curl --silent --head --fail http://localhost:$HEALTHCHECK_PORT$HEALTHCHECK_PATH || exit 1; fi'

# TODO: Revisit letting user define $PUID & $PGID overrides (e.g. `addgroup -g $PGID newgroup && adduser -D -G newgroup -u $PUID node`) as well as potentially ensure no root user exists. (Make sure no processes are running as root, first!)
# Use a non-root user (recommended for security)
USER $USERNAME

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "main"]