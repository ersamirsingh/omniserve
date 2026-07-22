# OmniServe - Multi-Tenant Restaurant OS & Order Simulator Stack

Comprehensive food ordering, POS, KDS, and online integration platform with a standalone **Order Simulator Tool**.

---

## 🐳 Running the Complete Stack with Docker (Recommended)

Run Frontend, Backend, MongoDB, Redis, and Order Simulator all together in Docker with a single command:

```bash
# From omniserve root directory:
docker compose up --build
```

### Services & Port Mappings

| Service | Description | Access URL | Port |
| :--- | :--- | :--- | :--- |
| **Client** | OmniServe Admin & KDS Web App | `http://localhost:5173` | `5173` |
| **Order Simulator** | Delayed & Batch Test Launcher | `http://localhost:5050` | `5050` |
| **Server** | Backend API & WebSockets | `http://localhost:5000/api/v1` | `5000` |
| **MongoDB** | Primary Database | `mongodb://localhost:27017` | `27017` |
| **Redis** | In-Memory Cache & Adapter | `redis://localhost:6379` | `6379` |

---

## 💻 Running Locally without Docker

### 1. Backend Server
```bash
cd server
npm install
npm run dev
```

### 2. Frontend Client
```bash
cd client
npm install
npm run dev
```

### 3. Order Simulator
```bash
cd order-simulator
npm install
npm run dev
```
