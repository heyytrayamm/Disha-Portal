FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

# Copy built frontend assets
COPY --from=build /app/dist /usr/share/nginx/html

# Support dynamic PORT environment variable (Railway) and SPA routing fallback
ENV PORT=80
EXPOSE 80

RUN mkdir -p /etc/nginx/templates/ && printf 'server {\n\
    listen ${PORT};\n\
    server_name localhost;\n\
\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/templates/default.conf.template

CMD ["nginx", "-g", "daemon off;"]

