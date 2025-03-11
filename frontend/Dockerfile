# To built image:
# docker build -t my-frontend-image .

# To start:
# docker run -d -p 3000:3000 my-frontend-image

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npx", "serve", "-s", "build", "-l", "3000"]

