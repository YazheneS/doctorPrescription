# 🚀 Azure VM Deployment Guide - MERN Prescription System

## Overview

This guide will help you deploy your MERN application on an Azure Virtual Machine with production-ready configuration.

---

## Part 1: Azure VM Setup

### Step 1: Create Azure VM

1. **Sign in to Azure Portal**
   - Go to https://portal.azure.com

2. **Create Virtual Machine**

   ```
   - Click "Create a resource" → "Virtual Machine"
   - Subscription: Your subscription
   - Resource Group: Create new "rg-prescription-prod"
   - VM Name: "vm-prescription-app"
   - Region: Choose closest to your users (e.g., East US, West Europe)
   - Image: Ubuntu Server 22.04 LTS
   - Size: Standard B2s (2 vCPUs, 4GB RAM) - minimum recommended
   - Authentication: SSH public key (recommended) or Password
   ```

3. **Configure Networking**
   - Allow ports: **22 (SSH)**, **80 (HTTP)**, **443 (HTTPS)**
   - Create public IP address: Yes
   - Note down the public IP address after creation

4. **Review + Create**
   - Click "Create" and wait 3-5 minutes

### Step 2: Connect to VM

**Windows (using PowerShell):**

```powershell
# If using SSH key
ssh -i path\to\your\private-key azureuser@YOUR_VM_PUBLIC_IP

# If using password
ssh azureuser@YOUR_VM_PUBLIC_IP
```

**Example:**

```bash
ssh azureuser@20.123.45.67
```

---

## Part 2: Server Configuration

### Step 1: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Node.js 20 LTS

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### Step 3: Install MongoDB

```bash
# Import MongoDB public key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB is running
sudo systemctl status mongod
```

### Step 4: Install Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 5: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

### Step 6: Install Git

```bash
sudo apt install -y git
```

---

## Part 3: Deploy Application

### Step 1: Clone Your Repository

```bash
# Navigate to app directory
cd /home/azureuser

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/yourusername/IOT.git
# OR upload files using SCP/SFTP

# Navigate to project
cd IOT
```

### Step 2: Set Up Environment Variables

```bash
# Create production .env file
cd server
nano .env
```

**Paste this configuration (update values):**

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/prescriptions
CLIENT_ORIGIN=http://YOUR_VM_PUBLIC_IP,https://YOUR_DOMAIN_NAME
JWT_SECRET=GENERATE_STRONG_SECRET_HERE_64_CHARS_MINIMUM
NODE_ENV=production

# Azure Document Intelligence
AZURE_DOC_INTELLIGENCE_ENDPOINT=https://yazh-med-intelligence.cognitiveservices.azure.com/
AZURE_DOC_INTELLIGENCE_KEY=YOUR_AZURE_KEY

# Groq API
GROQ_API_KEY=YOUR_GROQ_API_KEY
```

**Generate strong JWT secret:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save file: `Ctrl+O`, `Enter`, `Ctrl+X`

### Step 3: Install Dependencies

```bash
# Install server dependencies
cd /home/azureuser/IOT/server
npm install --production

# Install client dependencies
cd /home/azureuser/IOT/client
npm install
```

### Step 4: Build Frontend

```bash
cd /home/azureuser/IOT/client
npm run build
```

This creates optimized production files in `dist/` folder.

---

## Part 4: Configure Nginx Reverse Proxy

### Step 1: Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/prescription-app
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    server_name YOUR_VM_PUBLIC_IP;  # Replace with your IP or domain

    # Frontend - Serve React build
    location / {
        root /home/azureuser/IOT/client/dist;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API - Proxy to Node.js
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Increase timeouts for file uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Increase max upload size for prescription images
    client_max_body_size 10M;
}
```

Replace `YOUR_VM_PUBLIC_IP` with your actual IP address.

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### Step 2: Enable Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/prescription-app /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## Part 5: Start Application with PM2

### Step 1: Start Backend Server

```bash
cd /home/azureuser/IOT/server
pm2 start src/index.js --name "prescription-api" --env production
```

### Step 2: Configure PM2 Startup

```bash
# Save PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Copy and run the command that PM2 outputs
# It will look like: sudo env PATH=$PATH:/usr/bin pm2 startup...
```

### Step 3: Monitor Application

```bash
# View running processes
pm2 list

# View logs
pm2 logs prescription-api

# Monitor in real-time
pm2 monit

# Restart application
pm2 restart prescription-api

# Stop application
pm2 stop prescription-api
```

---

## Part 6: Configure Firewall

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Part 7: SSL Certificate (HTTPS) - Optional but Recommended

### If you have a domain name:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts to enter email and agree to terms
# Certbot will automatically configure Nginx for HTTPS

# Auto-renewal is enabled by default, test it:
sudo certbot renew --dry-run
```

---

## Part 8: Test Your Deployment

### 1. **Test Backend API**

```bash
# From VM
curl http://localhost:5000/api/health

# From browser
http://YOUR_VM_PUBLIC_IP/api/health
```

### 2. **Test Frontend**

```
Open browser: http://YOUR_VM_PUBLIC_IP
```

### 3. **Test Full Application**

- Login as doctor/patient
- Create prescription
- Upload prescription image
- Verify AI parsing works

---

## Part 9: Maintenance & Monitoring

### View Application Logs

```bash
# PM2 logs
pm2 logs prescription-api

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Update Application

```bash
# Pull latest changes
cd /home/azureuser/IOT
git pull origin main

# Update backend
cd server
npm install --production
pm2 restart prescription-api

# Update frontend
cd ../client
npm install
npm run build
```

### Backup MongoDB

```bash
# Create backup script
sudo nano /home/azureuser/backup-mongodb.sh
```

**Script content:**

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/azureuser/mongodb-backups"
mkdir -p $BACKUP_DIR

mongodump --out=$BACKUP_DIR/backup_$TIMESTAMP
echo "Backup completed: $BACKUP_DIR/backup_$TIMESTAMP"

# Keep only last 7 days of backups
find $BACKUP_DIR -type d -name "backup_*" -mtime +7 -exec rm -rf {} \;
```

```bash
# Make executable
chmod +x /home/azureuser/backup-mongodb.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add this line:
0 2 * * * /home/azureuser/backup-mongodb.sh >> /home/azureuser/backup.log 2>&1
```

---

## Part 10: Useful Commands Reference

### PM2 Commands

```bash
pm2 start app         # Start app
pm2 restart app       # Restart app
pm2 stop app          # Stop app
pm2 delete app        # Remove from PM2
pm2 logs app          # View logs
pm2 monit            # Monitor resources
pm2 list             # List all apps
pm2 save             # Save current list
```

### Nginx Commands

```bash
sudo systemctl status nginx    # Check status
sudo systemctl restart nginx   # Restart
sudo systemctl reload nginx    # Reload config
sudo nginx -t                  # Test config
```

### MongoDB Commands

```bash
sudo systemctl status mongod   # Check status
sudo systemctl restart mongod  # Restart
mongosh                        # Open MongoDB shell
```

### System Monitoring

```bash
htop                  # Resource monitor
df -h                 # Disk usage
free -h               # Memory usage
netstat -tulpn        # Open ports
```

---

## Part 11: Security Hardening

### 1. Configure MongoDB Authentication

```bash
mongosh

# In MongoDB shell:
use admin
db.createUser({
  user: "appuser",
  pwd: "STRONG_PASSWORD_HERE",
  roles: [{ role: "readWrite", db: "prescriptions" }]
})

exit
```

**Update .env:**

```env
MONGODB_URI=mongodb://appuser:STRONG_PASSWORD_HERE@127.0.0.1:27017/prescriptions?authSource=admin
```

### 2. Disable Root Login

```bash
sudo nano /etc/ssh/sshd_config

# Change this line:
PermitRootLogin no

# Restart SSH
sudo systemctl restart sshd
```

### 3. Install Fail2Ban (Brute Force Protection)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Set Up Log Rotation

```bash
sudo nano /etc/logrotate.d/prescription-app
```

**Content:**

```
/home/azureuser/IOT/server/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 azureuser azureuser
    sharedscripts
}
```

---

## Part 12: Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs prescription-api

# Check if port 5000 is in use
sudo netstat -tulpn | grep 5000

# Restart application
pm2 restart prescription-api
```

### Nginx Errors

```bash
# Check Nginx error log
sudo tail -100 /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Check if Nginx is running
sudo systemctl status nginx
```

### MongoDB Connection Issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -100 /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod
```

### Can't Access Website

```bash
# Check if Nginx is listening on port 80
sudo netstat -tulpn | grep :80

# Check firewall rules
sudo ufw status

# Check Azure Network Security Group
# Go to Azure Portal → VM → Networking → Verify ports 80/443 are open
```

---

## Part 13: Cost Optimization

### Azure VM Recommendations

**Development/Testing:**

- **B1s**: 1 vCPU, 1GB RAM (~$8/month)

**Production - Small:**

- **B2s**: 2 vCPUs, 4GB RAM (~$30/month) ✅ Recommended

**Production - Medium:**

- **B2ms**: 2 vCPUs, 8GB RAM (~$60/month)

**Tips:**

1. Stop VM when not in use (Development only)
2. Use Azure Reserved Instances (1-year commitment = 40% savings)
3. Enable auto-shutdown for dev/test environments
4. Monitor with Azure Cost Management

---

## Part 14: Quick Deployment Checklist

- [ ] Create Azure VM (Ubuntu 22.04, Standard B2s)
- [ ] Configure Network Security Group (ports 22, 80, 443)
- [ ] SSH into VM
- [ ] Install Node.js, MongoDB, Nginx, PM2, Git
- [ ] Clone/Upload application code
- [ ] Configure .env file with production values
- [ ] Install dependencies (npm install)
- [ ] Build frontend (npm run build)
- [ ] Configure Nginx reverse proxy
- [ ] Start backend with PM2
- [ ] Configure PM2 startup script
- [ ] Enable firewall (ufw)
- [ ] Test application (frontend + backend)
- [ ] (Optional) Configure SSL with Certbot
- [ ] Set up MongoDB authentication
- [ ] Configure automated backups
- [ ] Monitor logs and performance

---

## 🎉 Your Application is Live!

**Access your application:**

- **Frontend**: http://YOUR_VM_PUBLIC_IP
- **API Health**: http://YOUR_VM_PUBLIC_IP/api/health

**Next Steps:**

1. Point your domain to the VM IP (if you have one)
2. Configure SSL certificate
3. Set up monitoring and alerts
4. Configure automated backups
5. Document any custom configurations

---

## 📞 Support Resources

- **Azure VM Documentation**: https://learn.microsoft.com/en-us/azure/virtual-machines/
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **MongoDB Documentation**: https://www.mongodb.com/docs/

**Estimated Total Deployment Time: 45-90 minutes**

Good luck with your deployment! 🚀
