# 🚀 ParKING Production Deployment Guide

This guide walks you through deploying the **ParKING** MERN stack application with **Vercel** (Frontend) and **Render** (Backend API & WebSockets), connected to a free **MongoDB Atlas** cloud database.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────┐
                      │             User Browser              │
                      └───────────────┬───────────────────────┘
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            │                                                   │
            ▼                                                   ▼
┌──────────────────────────┐                       ┌──────────────────────────┐
│     Vercel (Client)      │                       │     Render (Backend)     │
│   TanStack Start / SPA   │────── REST API ──────>│   Node.js / Express      │
│  parking-xxx.vercel.app  │<──── WebSockets ─────>│ parking-xxx.onrender.com │
└──────────────────────────┘                       └────────────┬─────────────┘
                                                                │
                                                                ▼
                                                   ┌──────────────────────────┐
                                                   │   MongoDB Atlas Cloud    │
                                                   │    Database Cluster      │
                                                   └──────────────────────────┘
```

---

## Step 1: Set up MongoDB Atlas (Cloud Database)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free account.
2. Create a new **Free Shared Cluster (M0)** (choose AWS or Google Cloud in your closest region).
3. **Database Access**:
   - Go to **Security** -> **Database Access**.
   - Click **Add New Database User**.
   - Create a username (e.g., `parking_admin`) and a secure password.
   - Assign the role `Read and write to any database`.
4. **Network Access**:
   - Go to **Security** -> **Network Access**.
   - Click **Add IP Address** -> Select **Allow Access From Anywhere** (`0.0.0.0/0`) -> Confirm.
5. **Get Connection String**:
   - Go to **Database** -> Click **Connect** next to your cluster.
   - Choose **Drivers** (Node.js).
   - Copy the connection URI:
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/parking?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your credentials, and ensure `/parking` is the database name.

---

## Step 2: Deploy Backend to Render

1. Sign in to [Render](https://dashboard.render.com/) with GitHub.
2. Click **New +** -> **Web Service** (or **Blueprint** using `render.yaml`).
3. Connect your repository: `NitishRajasekaran/ParKING`.
4. Fill in the service settings:
   - **Name**: `parking-backend`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   | Key | Value / Note |
   |---|---|
   | `PORT` | `5000` |
   | `MONGO_URI` | Your MongoDB Atlas connection string from Step 1 |
   | `JWT_SECRET` | Any long random secret string (e.g. `parking_jwt_secret_xyz123`) |
   | `QR_SECRET` | Any long random secret string (e.g. `parking_qr_secret_xyz123`) |
   | `SIMULATOR_KEY` | Any random string (e.g. `parking_sim_key_2026`) |
   | `CLIENT_URL` | Set to `*` initially (update with your Vercel URL after Step 3) |
6. Click **Deploy Web Service**.
7. Once deployed, copy your backend URL (e.g., `https://parking-backend.onrender.com`).
   - You can test it by opening `https://parking-backend.onrender.com/` in your browser. It will respond: `{"message":"ParKING backend is running!"}`.

---

## Step 3: Deploy Frontend to Vercel

1. Sign in to [Vercel](https://vercel.com/) with your GitHub account.
2. Click **Add New...** -> **Project**.
3. Import the `NitishRajasekaran/ParKING` repository.
4. In the **Configure Project** window:
   - **Root Directory**: Click **Edit** and select `client`.
   - **Framework Preset**: Vite (or TanStack Start).
   - Expand **Environment Variables** and add:
     | Key | Value |
     |---|---|
     | `VITE_API_URL` | `https://parking-backend.onrender.com` (Your Render URL from Step 2) |
5. Click **Deploy**.
6. Vercel will install dependencies and build the application. Once finished, you will receive your live domain (e.g., `https://parking-app.vercel.app`).

---

## Step 4: Connect Frontend & Backend

1. Return to your [Render Dashboard](https://dashboard.render.com/).
2. Open `parking-backend` -> **Environment**.
3. Edit `CLIENT_URL` to your production Vercel URL:
   ```
   https://parking-app.vercel.app
   ```
4. Save changes. Render will automatically redeploy with the updated CORS policy.

---

## Step 5: (Optional) Seed Admin Account

To create or reset your initial Admin or Platform credentials on the cloud database, run the following command locally using your MongoDB Atlas URI:

```bash
cd server
$env:MONGO_URI="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/parking"
npm run reset-password
```

---

## Verification Checklist

- [ ] Backend health check responds at `https://<backend-url>/`
- [ ] Vercel client loads without console errors at `https://<frontend-url>/`
- [ ] Driver and Guard accounts can register and log in
- [ ] Real-time updates and ticket validations sync via WebSockets
- [ ] Multi-tab sessions operate independently without overwriting credentials
