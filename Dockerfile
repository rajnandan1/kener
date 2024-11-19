FROM lsiobase/alpine:3.18 as base

ENV TZ=Etc/GMT

RUN \
  echo "**** install build packages ****" && \
  apk add --no-cache \
    nodejs \
    npm && \
  echo "**** cleanup ****" && \
  rm -rf \
    /root/.cache \
    /tmp/*

# set OS timezone specified by docker ENV
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone



COPY docker/root/ /



# build requires devDependencies which are not used by production deploy
# so build in a stage so we can copy results to clean "deploy" stage later
FROM base as build

WORKDIR /app

COPY --chown=abc:abc . /app

RUN npm install \
    && chown -R root:root node_modules \
    && npm run build

FROM base as app

# copy package, required libs (npm,nodejs) results of build, prod entrypoint, and examples to be used to populate config dir
# to clean, new stage
COPY --chown=abc:abc package*.json ./
COPY --from=base /usr/local/bin /usr/local/bin
COPY --from=base /usr/local/lib /usr/local/lib

COPY --chown=abc:abc static /app/static
COPY --chown=abc:abc database /app/database
COPY --chown=abc:abc build.js /app/build.js
COPY --chown=abc:abc sitemap.js /app/sitemap.js
COPY --chown=abc:abc openapi.json /app/openapi.json
COPY --chown=abc:abc src/lib/server /app/src/lib/server
COPY --chown=abc:abc src/lib/helpers.js /app/src/lib/helpers.js

COPY --from=build --chown=abc:abc /app/build /app/build
COPY --from=build --chown=abc:abc /app/main.js /app/main.js


ENV NODE_ENV=production

# install prod depdendencies and clean cache
RUN npm install --omit=dev \
    && npm cache clean --force \
    && chown -R abc:abc node_modules

ARG webPort=3000
ENV PORT=$webPort
EXPOSE $PORT

# leave entrypoint blank!
# uses LSIO s6-init entrypoint with scripts
# that populate CONFIG_DIR with static dir, monitor/site.yaml when dir is empty
# and chown's all files so they are owned by proper user based on PUID/GUID env
