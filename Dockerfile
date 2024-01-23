FROM node:lts-alpine as builder
COPY ./ /app
WORKDIR /app
ENV PUBLIC_KENER_FOLDER=/app/static/kener
RUN npm i && npm run build
RUN mkdir -p static/kener && mv config/monitors.example.yaml config/monitors.yaml && mv config/site.example.yaml config/site.yaml
              
FROM gcr.io/distroless/nodejs20-debian12
COPY --from=builder /app /app
WORKDIR /app
EXPOSE 3000/tcp
ENV PUBLIC_KENER_FOLDER=/app/static/kener
ENV GH_TOKEN=some-token
ENV API_TOKEN=sometoken
ENV PORT=3000
CMD ["prod.js"]
