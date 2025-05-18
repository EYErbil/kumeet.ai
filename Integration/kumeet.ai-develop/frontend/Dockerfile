FROM node:18-slim AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci
# Copy the rest of the code
COPY . .

# Build the app
RUN npm run build

# Production environment
FROM nginx:stable-alpine

# Copy build folder from build stage to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"] 