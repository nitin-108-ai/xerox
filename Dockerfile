FROM node:20-alpine AS builder

WORKDIR /app

# Copy root, backend and frontend package files
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN cd backend && npm install
RUN cd frontend && npm install

# Copy source codes
COPY backend ./backend
COPY frontend ./frontend

# Build frontend and backend
RUN cd frontend && npm run build
RUN cd backend && npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY backend/package.json ./backend/

RUN cd backend && npm install --omit=dev

COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/src/db/schema.sql ./backend/dist/db/schema.sql
COPY --from=builder /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/private_storage

EXPOSE 5000

CMD ["node", "backend/dist/server.js"]
