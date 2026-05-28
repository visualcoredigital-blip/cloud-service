FROM node:18-alpine

WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm install

# Copiar todo el código fuente (incluye index.js y la carpeta functions/)
COPY src/ ./src

EXPOSE 8080

CMD [ "node", "src/index.js" ]