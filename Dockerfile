FROM node:20-slim

WORKDIR /app

# Copy package and application sources
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --omit=dev
COPY server.js ./
COPY index.html ./
COPY style.css ./
COPY src/ ./src/

# Google Cloud Run injects PORT environment variable (defaults to 8080)
ENV PORT=8080
ENV HOST=0.0.0.0

EXPOSE 8080

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/ || exit 1

# Start the FocusPulse server
CMD ["node", "server.js"]
