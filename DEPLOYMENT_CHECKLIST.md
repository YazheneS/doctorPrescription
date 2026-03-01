# Azure VM Deployment Checklist

## Pre-Deployment (Before Starting)

- [ ] Azure account created and verified
- [ ] Azure subscription active with credits/payment
- [ ] Groq API key ready (from https://console.groq.com)
- [ ] Azure Document Intelligence key ready
- [ ] Decided on VM region (choose closest to users)
- [ ] Decided on VM size (B2s recommended for production)
- [ ] SSH keys generated (optional, can use password)

---

## Phase 1: Azure VM Setup (5-10 minutes)

- [ ] Logged into Azure Portal (https://portal.azure.com)
- [ ] Created resource group: "rg-prescription-prod"
- [ ] Created Virtual Machine:
  - [ ] Name: vm-prescription-app
  - [ ] Region selected
  - [ ] Image: Ubuntu Server 22.04 LTS
  - [ ] Size: Standard B2s (2 vCPUs, 4GB RAM)
  - [ ] Authentication configured (SSH key or password)
- [ ] Network Security Group configured:
  - [ ] Port 22 (SSH) allowed
  - [ ] Port 80 (HTTP) allowed
  - [ ] Port 443 (HTTPS) allowed
- [ ] VM created successfully
- [ ] **Public IP address copied:** **********\_**********

---

## Phase 2: File Upload (5 minutes)

- [ ] Opened PowerShell in IOT folder on Windows
- [ ] Ran: `.\Upload-ToAzureVM.ps1`
- [ ] Entered VM IP address
- [ ] Entered VM username
- [ ] Chose authentication method
- [ ] Upload completed successfully
- [ ] Files extracted on VM

---

## Phase 3: Environment Configuration (5 minutes)

- [ ] SSH connected to VM: `ssh azureuser@YOUR_VM_IP`
- [ ] Navigated to server folder: `cd IOT/server`
- [ ] Opened .env file: `nano .env`
- [ ] **JWT_SECRET generated and added:**
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Value: ********************\_\_\_********************
- [ ] CLIENT_ORIGIN updated with VM IP
- [ ] AZURE_DOC_INTELLIGENCE_ENDPOINT verified
- [ ] AZURE_DOC_INTELLIGENCE_KEY added
- [ ] GROQ_API_KEY added
- [ ] NODE_ENV set to "production"
- [ ] .env file saved (Ctrl+O, Enter, Ctrl+X)

---

## Phase 4: Automated Deployment (10-15 minutes)

- [ ] Navigated to app folder: `cd /home/azureuser/IOT`
- [ ] Made script executable: `chmod +x deploy-azure-vm.sh`
- [ ] Ran deployment script: `./deploy-azure-vm.sh`
- [ ] Script completed without errors:
  - [ ] Node.js 20 installed
  - [ ] MongoDB 7.0 installed
  - [ ] Nginx installed
  - [ ] PM2 installed
  - [ ] Backend dependencies installed
  - [ ] Frontend dependencies installed
  - [ ] Frontend built successfully
  - [ ] Nginx configured
  - [ ] Application started with PM2
  - [ ] PM2 startup configured
  - [ ] Firewall configured

---

## Phase 5: Testing (5 minutes)

### Frontend Test

- [ ] Opened browser: `http://YOUR_VM_IP`
- [ ] Login page loads correctly
- [ ] Professional medical theme displayed
- [ ] Gradient backgrounds showing

### Backend API Test

- [ ] API health check works: `http://YOUR_VM_IP/api/health`
- [ ] Returns success response

### Authentication Test

- [ ] Can create doctor account
- [ ] Can login as doctor
- [ ] Dashboard loads correctly

### Prescription Test

- [ ] Can create new prescription
- [ ] Prescription form loads
- [ ] Can save prescription

### File Upload Test

- [ ] Can upload prescription image
- [ ] OCR processes image
- [ ] AI parsing extracts information
- [ ] Parsed data displays correctly

### History Test

- [ ] Prescription history loads
- [ ] Can view previous prescriptions
- [ ] Search/filter works

---

## Phase 6: Post-Deployment (Optional)

### Security Hardening

- [ ] MongoDB authentication configured
- [ ] Root login disabled
- [ ] Fail2Ban installed (brute force protection)
- [ ] Log rotation configured

### Monitoring

- [ ] PM2 monitoring checked: `pm2 monit`
- [ ] Application logs verified: `pm2 logs`
- [ ] Nginx logs checked: `sudo tail -f /var/log/nginx/access.log`
- [ ] MongoDB status verified: `sudo systemctl status mongod`

### Backups

- [ ] Backup script created: `/home/azureuser/backup-mongodb.sh`
- [ ] Backup script made executable
- [ ] Cron job configured for daily backups
- [ ] Test backup run successful

### Domain & SSL (If applicable)

- [ ] Domain name purchased
- [ ] DNS A record pointed to VM IP
- [ ] DNS propagation verified (use https://dnschecker.org)
- [ ] Certbot installed
- [ ] SSL certificate obtained: `sudo certbot --nginx -d yourdomain.com`
- [ ] HTTPS working
- [ ] HTTP → HTTPS redirect configured
- [ ] Auto-renewal tested: `sudo certbot renew --dry-run`

---

## Phase 7: Documentation

- [ ] VM IP address documented
- [ ] VM credentials saved securely
- [ ] .env file backed up locally (encrypted)
- [ ] JWT_SECRET saved in password manager
- [ ] MongoDB auth credentials saved (if configured)
- [ ] Domain name and DNS settings documented
- [ ] SSL certificate renewal date noted
- [ ] Deployment date recorded: ******\_\_\_******

---

## Phase 8: Maintenance Plan

### Daily

- [ ] Check application status: `pm2 list`
- [ ] Monitor error logs: `pm2 logs --err`
- [ ] Monitor disk space: `df -h`

### Weekly

- [ ] Review application logs for errors
- [ ] Check MongoDB backup integrity
- [ ] Monitor system resources: `htop`
- [ ] Check SSL certificate expiry date

### Monthly

- [ ] System updates: `sudo apt update && sudo apt upgrade -y`
- [ ] Review Azure costs
- [ ] Review backup retention policy
- [ ] Test application thoroughly
- [ ] Check for npm package updates

---

## Troubleshooting Reference

### Application Not Starting

```bash
pm2 logs prescription-api        # Check errors
pm2 restart prescription-api     # Restart app
sudo systemctl restart mongod    # Restart MongoDB
```

### Can't Access Website

```bash
sudo systemctl status nginx      # Check Nginx
sudo ufw status                  # Check firewall
pm2 list                         # Check app running
```

### 502 Bad Gateway

```bash
pm2 logs prescription-api        # Check app logs
sudo systemctl restart nginx     # Restart Nginx
pm2 restart prescription-api     # Restart app
```

### File Upload Errors

```bash
# Check Nginx config
sudo nano /etc/nginx/sites-available/prescription-app
# Verify: client_max_body_size 10M;
sudo nginx -t
sudo systemctl reload nginx
```

---

## Success Criteria ✅

All of these should be true:

- ✅ Application accessible at http://YOUR_VM_IP
- ✅ Login/registration works
- ✅ Can create and view prescriptions
- ✅ File upload and AI parsing works
- ✅ No errors in PM2 logs
- ✅ MongoDB running and accessible
- ✅ Nginx serving frontend correctly
- ✅ All API endpoints responding
- ✅ Mobile-responsive design working
- ✅ No console errors in browser
- ✅ HTTPS working (if SSL configured)
- ✅ Backups running (if configured)

---

## Deployment Complete! 🎉

**Application URL:** http://YOUR_VM_IP (or https://yourdomain.com)

**Access Information:**

- VM IP: ************\_\_\_************
- VM Username: **********\_**********
- Application Port: 5000 (backend), 80/443 (frontend)
- MongoDB Port: 27017 (localhost only)

**Important Files:**

- Application: `/home/azureuser/IOT`
- Nginx Config: `/etc/nginx/sites-available/prescription-app`
- PM2 Logs: `~/.pm2/logs/`
- MongoDB: `/var/lib/mongodb`
- Backups: `/home/azureuser/mongodb-backups` (if configured)

**Quick Commands:**

```bash
# View app status
pm2 list

# View logs
pm2 logs prescription-api

# Restart app
pm2 restart prescription-api

# SSH to VM
ssh azureuser@YOUR_VM_IP
```

**Next Actions:**

1. Share application URL with test users
2. Document any custom configurations
3. Set up monitoring alerts (optional)
4. Plan for scaling if needed

**Congratulations on your successful deployment!** 🚀
