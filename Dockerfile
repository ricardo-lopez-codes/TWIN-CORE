# Multi-stage Dockerfile for TWIN-CORE High-Altitude Digital Twin System

# Stage 1: Build the React + Vite Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production Python Backend + Unified Static Serving
FROM python:3.11-slim AS production
WORKDIR /app

# Prevent Python from writing .pyc and buffer output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend application source code
COPY backend/ ./backend/

# Copy built frontend production artifacts into the frontend/dist folder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Ensure SQLite data directory exists
RUN mkdir -p /app/backend/data

# Default port for Render, Railway, Cloud Run
ENV PORT=8000
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Launch FastAPI Uvicorn server
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
