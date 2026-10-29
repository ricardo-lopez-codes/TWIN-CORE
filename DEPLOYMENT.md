# TWIN-CORE Deployment & Hosting Guide

TWIN-CORE supports unified, single-port deployment where the FastAPI backend serves both the interactive React + Vite frontend, live WebSockets, REST API endpoints, and SQLite storage on a single port (`8000`).

---

## 1. Local Network / LAN Access (Immediate)

Any smartphone, tablet, or secondary PC connected to your local Wi-Fi can access the dashboard immediately without internet uploads:

1. The unified server is listening on `0.0.0.0:8000`.
2. Find your local Wi-Fi IP address (e.g., `192.168.1.2`).
3. On your phone or another laptop on the same network, open:
   ```
   http://192.168.1.2:8000
   ```
   *(Ensure Windows Firewall allows inbound connections on port 8000).*

---

## 2. Public Internet Live Tunnel (Cloudflare Quick Tunnel)

Cloudflare Tunnels expose the local running server to a secure, public HTTPS URL with zero configuration or port forwarding:

```powershell
.\tools\cloudflared.exe tunnel --url http://localhost:8000
```
This generates a live public URL such as:
`https://<random-id>.trycloudflare.com`

---

## 3. Free Cloud Hosting: Render.com (24/7 Permanent)

Deploy permanently on Render's free tier:

1. Push this repository to GitHub or GitLab.
2. Sign in to [Render.com](https://render.com).
3. Click **New +** → **Blueprint**.
4. Select your repository. Render will automatically read [`render.yaml`](render.yaml) and deploy the Docker container.
5. Your dashboard will be live at `https://twincore-digital-twin.onrender.com`.

---

## 4. Free Cloud Hosting: Railway.app

1. Sign in to [Railway.app](https://railway.app).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Railway automatically detects [`railway.json`](railway.json) and [`Dockerfile`](Dockerfile), compiles the React app, and deploys the FastAPI container with automatic SSL certificate.

---

## 5. Docker Container Deployment

To run TWIN-CORE anywhere via Docker:

```bash
# Build the production image (builds React frontend + Python environment)
docker build -t twincore-dashboard .

# Run the container
docker run -d -p 8000:8000 -v twincore-data:/app/backend/data --name twincore twincore-dashboard
```
Access at `http://localhost:8000`.
