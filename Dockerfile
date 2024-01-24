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

ARG data_dir=/config
VOLUME $data_dir
ENV CONFIG_DIR=$data_dir

COPY docker/root/ /

# Dir ENVs need to be set before building or else build throws errors
ENV PUBLIC_KENER_FOLDER=/config/static \
    MONITOR_YAML_PATH=/config/monitors.yaml \
    SITE_YAML_PATH=/config/site.yaml

# build requires devDependencies which are not used by production deploy
# so build in a stage so we can copy results to clean "deploy" stage later
FROM base as build

WORKDIR /app

COPY --chown=abc:abc . /app

# build requires PUBLIC_KENER_FOLDER dir exists so create temporarily
# -- it is non-existent in final stage to allow proper startup and chown'ing/example population
RUN mkdir -p mkdir -p "${CONFIG_DIR}"/static \
    && npm install \
    && chown -R root:root node_modules \
    && npm run kener:build

FROM base as app

# copy package, required libs (npm,nodejs) results of build, prod entrypoint, and examples to be used to populate config dir
# to clean, new stage
COPY --chown=abc:abc package*.json ./
COPY --from=base /usr/local/bin /usr/local/bin
COPY --from=base /usr/local/lib /usr/local/lib
COPY --chown=abc:abc scripts /app/scripts
COPY --chown=abc:abc static /app/static
COPY --chown=abc:abc config /app/config
COPY --from=build --chown=abc:abc /app/build /app/build
COPY --from=build --chown=abc:abc /app/prod.js /app/prod.js

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
