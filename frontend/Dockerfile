# To built image:
# docker build -t my-frontend-image .

# To start:
# docker run -d -p 3000:3000 my-frontend-image

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Set environment variables for API connection
ENV REACT_APP_API_URL=http://localhost:8000/api
ENV NODE_ENV=development

# Use development mode instead of serving a static build
EXPOSE 3000

CMD ["npm", "start"]

