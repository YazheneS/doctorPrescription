# 🚀 MERN Stack Deployment on Azure Virtual Machine

## 📌 Project Deployment Documentation

This document explains the complete process of deploying a MERN (MongoDB, Express, React, Node.js) stack application on a Virtual Machine using **Microsoft Azure**.

---

# 🏗 Architecture Overview

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas (Cloud Database)
- **Hosting:** Azure Virtual Machine (Ubuntu 24.04 LTS)
- **Source Code:** GitHub Repository

---

# ⚙️ Step 1: Create Azure Virtual Machine

1. Login to Azure Portal.
2. Create a new **Virtual Machine**.
3. Choose:
   - OS: Ubuntu 24.04 LTS
   - Authentication type: SSH Key

4. Download the `.pem` key file.
5. Open required ports:
   - 22 (SSH)
   - 5000 (Backend)
   - 4173 (Frontend)

---

# 🔐 Step 2: Connect to Azure VM via SSH

From local machine:

```bash
ssh -i "path/to/key.pem" azureuser@<public-ip>
```

After successful login:

```bash
azureuser@YourVM:~$
```

---

# 📦 Step 3: Install Node.js

Check Node installation:

```bash
node -v
npm -v
```

If not installed:

```bash
sudo apt update
sudo apt install nodejs npm -y
```

---

# 📥 Step 4: Clone Project from GitHub

From VM:

```bash
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>
```

(Repository hosted on **GitHub**)

---

# 🗄 Step 5: Setup MongoDB Atlas

1. Create a free cluster in **MongoDB Atlas**.
2. Add IP access:

   ```
   0.0.0.0/0
   ```

3. Create database user.
4. Get connection string:

```
mongodb+srv://username:password@cluster.mongodb.net/databaseName
```

If password contains `@`, encode it as `%40`.

Example:

```
Yazhene@2006 → Yazhene%402006
```

---

# 🔑 Step 6: Configure Environment Variables

Inside VM:

```bash
cd server
nano .env
```

Add:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/databaseName
JWT_SECRET=your_secret_key
CLIENT_ORIGIN=http://<public-ip>:4173
```

Save and exit:

```
CTRL + X
Y
ENTER
```

---

# 🖥 Step 7: Install Backend Dependencies

```bash
cd server
npm install
```

Run backend:

```bash
node src/index.js
```

If successful:

```
API running on port 5000
```

Test:

```
http://<public-ip>:5000/api/health
```

---

# 🎨 Step 8: Build Frontend

```bash
cd client
npm install
npm run build
```

Start frontend preview:

```bash
npm run preview -- --host
```

Access application:

```
http://<public-ip>:4173
```

---

# 🔥 Step 9: Open Azure Firewall Ports

In Azure Portal → VM → Networking → Add Inbound Rules:

| Port | Protocol | Purpose  |
| ---- | -------- | -------- |
| 22   | TCP      | SSH      |
| 5000 | TCP      | Backend  |
| 4173 | TCP      | Frontend |

---

# ✅ Final Deployment Status

Application successfully hosted on Azure VM:

- Backend running on port 5000
- Frontend running on port 4173
- MongoDB connected via Atlas
- Publicly accessible via VM Public IP

---

# 📚 What Was Achieved

- Cloud VM provisioning
- SSH configuration
- Environment variable setup
- MongoDB Atlas cloud integration
- Firewall configuration
- Production build deployment

---

# 🚀 Future Improvements (Production Ready Setup)

- Use PM2 to keep backend running permanently
- Configure Nginx reverse proxy
- Serve application on port 80
- Add custom domain
- Enable HTTPS (SSL certificate)

---

# 🎓 Deployment Summary

This project demonstrates full-stack cloud deployment of a MERN application using:

- Azure Virtual Machine
- MongoDB Atlas
- Node.js & Express
- React (Vite)
- GitHub version control

The application is publicly accessible and successfully integrated with a cloud database.

---
