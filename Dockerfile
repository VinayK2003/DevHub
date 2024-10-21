# Build stage for NextJS frontend
FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# Build stage for Golang backend
FROM golang:1.22 AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY Internals ./Internals
WORKDIR /app/Internals
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Final stage
FROM node:18-alpine
RUN apk --no-cache add ca-certificates
WORKDIR /root/

# Copy the frontend build
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/package.json ./package.json
COPY --from=frontend-builder /app/frontend/node_modules ./node_modules

# Copy the backend binary
COPY --from=backend-builder /app/Internals/main ./

# Expose ports for frontend and backend
EXPOSE 3000 8080

# Start both frontend and backend
CMD ["sh", "-c", "npm start & ./main"]