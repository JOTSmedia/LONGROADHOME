FROM node:24-bookworm-slim AS build
WORKDIR /build
COPY scripts/build.mjs ./scripts/build.mjs
COPY index.html film.css film.js entrance.html entrance.css entrance.js ./
COPY assets ./assets
RUN node scripts/build.mjs

FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json server.mjs ./
COPY --from=build /build/dist ./dist
RUN mkdir /data && chown node:node /data
USER node
ENV NODE_ENV=production PORT=4177 HOST=0.0.0.0 STATE_DIR=/data
EXPOSE 4177
CMD ["node","server.mjs"]
