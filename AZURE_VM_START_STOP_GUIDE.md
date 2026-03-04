# Azure VM – Starting and Stopping MERN Application

This document explains how to:

1. Start the hosted MERN stack application
2. Properly stop everything to avoid Azure charges

---

# 🚀 STARTING THE APPLICATION (Next Day)

## Step 1: Start the Azure Virtual Machine

1. Go to Azure Portal
2. Click **Virtual Machines**
3. Select your VM (e.g., YazhVM)
4. Click **Start**
5. Wait until the status shows: **Running**

---

## Step 2: Connect via SSH

From your local machine terminal (PowerShell / CMD):

```bash
ssh -i "path-to-your-key.pem" azureuser@<your-public-ip>
```

Example:

```bash
ssh -i "C:\Users\YAZHENE\Downloads\YazhVM_key.pem" azureuser@20.193.133.213
```

---

## Step 3: Start Backend Server

Navigate to your project backend folder:

```bash
cd ~/doctorPrescription/server
```

Start the backend:

```bash
node src/index.js
```

You should see:

```
API running on port 5000
```

---

## Step 4: Start Frontend

Open a new SSH terminal (or run in another session).

Navigate to client folder:

```bash
cd ~/doctorPrescription/client
```

Start preview server:

```bash
npm run preview -- --host
```

You should see something like:

```
Local:   http://localhost:4173/
Network: http://172.x.x.x:4173/
```

Now open in browser:

```
http://<your-public-ip>:4173
```

Your application should now be live.

---

# 🛑 STOPPING THE APPLICATION (To Save Azure Credits)

## Step 1: Stop Backend and Frontend

Inside SSH terminal:

If backend is running:

Press:

```
CTRL + C
```

If frontend is running:

Press:

```
CTRL + C
```

This stops Node processes.

---

## Step 2: Stop the Azure Virtual Machine

⚠ **IMPORTANT:** If you do not stop the VM, Azure continues charging.

1. Go to Azure Portal
2. Click **Virtual Machines**
3. Select your VM
4. Click **Stop**
5. Wait until status shows: **Stopped (Deallocated)**

Only when it says **Deallocated**, billing stops.

---

# 🔎 Important Notes

- If you close SSH without stopping VM → Azure still charges.
- If VM restarts → you must manually start backend and frontend again.
- Public IP usually remains the same unless not configured as static.

---

# 📌 Summary

## To Start:

1. Start VM
2. SSH into VM
3. Run backend
4. Run frontend

## To Stop:

1. Stop backend (CTRL + C)
2. Stop frontend (CTRL + C)
3. Stop VM (Deallocate)

---
