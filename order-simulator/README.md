# OmniServe Order Simulator & Delayed Order Launcher

A standalone microservice and interactive testing tool for **OmniServe** that allows you to simulate and schedule online orders (Swiggy, Zomato, Website) after a customizable delay (e.g. 5s, 15s, 30s, 2m) or in multi-order batches (e.g. 5 orders at once).

---

## 🚀 Quick Start Guide

### Option 1: Run via Node.js
```bash
# 1. Navigate to order-simulator folder
cd omniserve/order-simulator

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```
Open **`http://localhost:5050`** in your browser.

---

### Option 2: Run via Docker
```bash
# 1. Navigate to order-simulator folder
cd omniserve/order-simulator

# 2. Build and start with Docker Compose
docker compose up --build
```
Open **`http://localhost:5050`** in your browser.

---

## 🎯 Features

- **Delayed Order Thrower**: Set timer delays (5s, 15s, 30s, 1 min, 2 min, custom seconds).
- **Batch / Concurrent Orders**: Fire 1, 3, 5, 10, or custom N orders at once.
- **Provider Channels**: Swiggy (Mock), Zomato (Mock), or Mixed channels.
- **Live Countdown Timer**: Real-time progress bars ticking down in the browser dashboard.
- **Payload Generators**: Generates randomized items, customer details, and order amounts matching OmniServe adapter specifications.
- **Docker Containerized**: Built with Dockerfile and docker-compose.yml for production or isolated container testing.

---

## 📡 API Endpoints

The Order Simulator exposes REST endpoints on port `5050`:

- `POST /api/simulator/schedule`: Schedule a delayed single/batch order throw.
  ```json
  {
    "tenantId": "660f...",
    "provider": "MOCK_SWIGGY",
    "orderCount": 5,
    "delaySeconds": 15
  }
  ```
- `GET /api/simulator/tasks`: Get active countdown tasks and execution history.
- `DELETE /api/simulator/tasks/:id`: Cancel a pending scheduled order.
- `GET /api/simulator/health`: Health check endpoint.
