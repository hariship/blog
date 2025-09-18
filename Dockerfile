# Multi-stage build for optimized production
FROM node:18-alpine AS builder

# Accept build arguments
ARG REACT_APP_API_BASE_URL=https://api.haripriya.org

WORKDIR /app

# Copy package files
COPY package*.json ./

# Clean install dependencies
RUN npm cache clean --force && \
    npm install

# Copy source code
COPY . .

# Set environment variable for build
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Build the app with CI=false to treat warnings as non-fatal
ENV CI=false
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Create nginx config for SPA routing
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
    gzip on; \
    gzip_vary on; \
    gzip_min_length 1000; \
    gzip_types text/plain text/css text/javascript application/javascript application/json text/xml application/xml; \
}' > /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
