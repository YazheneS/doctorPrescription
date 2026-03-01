# 🚀 Azure VM Quick Start Guide

## Prerequisites

- Azure account with active subscription
- Windows machine with PowerShell
- Your application API keys ready

---

## 3-Step Azure VM Deployment

### Step 1: Create Azure VM (5 minutes)

1. Go to https://portal.azure.com
2. Click **"Create a resource"** → **"Virtual Machine"**
3. Fill in basic settings:
   ```
   Resource Group: Create new "rg-prescription-prod"
   VM Name: vm-prescription-app
   Region: Choose closest to your users
   Image: Ubuntu Server 22.04 LTS
   Size: Standard B2s (2 vCPUs, 4GB RAM)
   Authentication: SSH public key or Password
   ```
4. Networking tab:
   - Allow inbound ports: **22 (SSH)**, **80 (HTTP)**, **443 (HTTPS)**
5. Click **"Review + Create"** → **"Create"**
6. **Copy the public IP address** after creation

---

### Step 2: Upload Application Files (5 minutes)

Run this from your Windows machine in the IOT folder:

```powershell
.\Upload-ToAzureVM.ps1
```

When prompted:

- Enter your VM public IP address
- Enter username (default: azureuser)
- Choose authentication method (password or SSH key)
- Wait for upload to complete (2-5 minutes)

---

### Step 3: Configure and Deploy (10 minutes)

#### A. SSH into your VM:

```bash
ssh azureuser@YOUR_VM_IP
```

#### B. Configure environment variables:

```bash
cd IOT/server
nano .env
```

**Add your production values:**

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/prescriptions
CLIENT_ORIGIN=http://YOUR_VM_IP
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
NODE_ENV=production

AZURE_DOC_INTELLIGENCE_ENDPOINT=https://yazh-med-intelligence.cognitiveservices.azure.com/
AZURE_DOC_INTELLIGENCE_KEY=YOUR_AZURE_KEY

GROQ_API_KEY=YOUR_GROQ_KEY
```

**Generate JWT secret:**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save file: `Ctrl+O`, `Enter`, `Ctrl+X`

#### C. Run automated deployment script:

```bash
cd /home/azureuser/IOT
chmod +x deploy-azure-vm.sh
./deploy-azure-vm.sh
```

This script will:

- ✅ Install Node.js 20 LTS
- ✅ Install MongoDB 7.0
- ✅ Install Nginx
- ✅ Install PM2 process manager
- ✅ Install dependencies
- ✅ Build frontend
- ✅ Configure Nginx reverse proxy
- ✅ Start application with PM2
- ✅ Configure firewall

**Wait 5-10 minutes for completion.**

---

## Step 4: Test Your Application

### Open in browser:

```
http://YOUR_VM_IP
```

### Test API health:

```
http://YOUR_VM_IP/api/health
```

### Test full functionality:

1. ✅ Login as doctor/patient
2. ✅ Create new prescription
3. ✅ Upload prescription image
4. ✅ Verify AI parsing works
5. ✅ Check prescription history

---

## Useful Commands

### View Application Status

```bash
pm2 list                    # Running processes
pm2 logs prescription-api   # View logs
pm2 monit                   # Monitor resources
```

### Restart Application

```bash
pm2 restart prescription-api
```

### View Logs

```bash
pm2 logs                           # Application logs
sudo tail -f /var/log/nginx/error.log   # Nginx errors
```

### Update Application

```bash
cd /home/azureuser/IOT
git pull origin main               # Or re-upload files
cd server && npm install --production
cd ../client && npm install && npm run build
pm2 restart prescription-api
```

---

## Next Steps (Optional)

### 1. Set Up Domain Name

Point your domain to the VM IP:

```
A Record: @ → YOUR_VM_IP
A Record: www → YOUR_VM_IP
```

### 2. Configure SSL Certificate

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 3. Set Up MongoDB Authentication

```bash
mongosh
use admin
db.createUser({
  user: "appuser",
  pwd: "STRONG_PASSWORD",
  roles: [{ role: "readWrite", db: "prescriptions" }]
})
```

Update .env:

```env
MONGODB_URI=mongodb://appuser:STRONG_PASSWORD@127.0.0.1:27017/prescriptions?authSource=admin
```

### 4. Configure Automated Backups

```bash
nano /home/azureuser/backup-mongodb.sh
```

Add:

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mongodump --out=/home/azureuser/backups/backup_$TIMESTAMP
```

```bash
chmod +x /home/azureuser/backup-mongodb.sh
crontab -e
# Add: 0 2 * * * /home/azureuser/backup-mongodb.sh
```

---

## Troubleshooting

### Application not starting

```bash
pm2 logs prescription-api   # Check error logs
pm2 restart prescription-api
```

### Can't access website

```bash
# Check if services are running
sudo systemctl status nginx
sudo systemctl status mongod
pm2 list

# Check firewall
sudo ufw status

# Check Azure NSG (Network Security Group)
# Go to Azure Portal → VM → Networking → Verify ports 80/443 are open
```

### MongoDB connection errors

```bash
sudo systemctl restart mongod
sudo systemctl status mongod
```

---

## Cost Breakdown

**Monthly Costs:**

- VM (Standard B2s): ~$30/month
- Storage (30GB): ~$2/month
- Bandwidth (50GB): ~$4/month
- **Total: ~$36/month**

**Save Money:**

- Use B1s for development: ~$8/month
- Stop VM when not in use (dev only)
- Use Reserved Instances (1-year commitment): 40% savings

---

## Support

**Detailed Documentation:**

- Complete guide: [AZURE_VM_DEPLOYMENT.md](AZURE_VM_DEPLOYMENT.md)
- Alternative platforms: [DEPLOYMENT.md](DEPLOYMENT.md)
- Project overview: [README.md](README.md)

**Common Issues:**

1. Port conflicts → Azure NSG configuration
2. 502 Bad Gateway → Check PM2 logs
3. MongoDB errors → Check MongoDB status
4. File upload errors → Check nginx client_max_body_size

**Need Help?**

- Azure VM Docs: https://learn.microsoft.com/en-us/azure/virtual-machines/
- PM2 Docs: https://pm2.keymetrics.io/docs/
- MongoDB Docs: https://www.mongodb.com/docs/

---

## Summary

✅ **Total Setup Time:** ~20 minutes  
✅ **Cost:** ~$30-36/month  
✅ **Difficulty:** Easy (mostly automated)  
✅ **Full Control:** Complete server access  
✅ **Scalability:** Can upgrade VM size anytime

**Your app is now live! 🎉**
