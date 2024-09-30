# Stage 1: Build the Next.js frontend
FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# Stage 2: Build the Go backend
FROM golang:1.22 AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY main.go .
COPY Internals ./Internals
RUN go build -o /app/main ./main.go

# Stage 3: Create the final image
FROM alpine:3.14
RUN apk --no-cache add ca-certificates

WORKDIR /app
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/package.json ./package.json
COPY --from=frontend-builder /app/frontend/node_modules ./node_modules
COPY --from=backend-builder /app/main ./main

EXPOSE 3000 8080

CMD ["sh", "-c", "node_modules/.bin/next start & ./main"]
