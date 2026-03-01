#!/bin/bash

# Azure VM Deployment Script for MERN Prescription System
# This script automates the deployment process on a fresh Ubuntu 22.04 VM

set -e  # Exit on any error

echo "========================================="
echo "Azure VM Deployment Script"
echo "MERN Prescription System"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root"
    exit 1
fi

echo "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System updated"

echo ""
echo "Step 2: Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
    print_status "Node.js installed: $(node --version)"
else
    print_status "Node.js already installed: $(node --version)"
fi

echo ""
echo "Step 3: Installing MongoDB 7.0..."
if ! command -v mongod &> /dev/null; then
    curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    sudo apt update
    sudo apt install -y mongodb-org
    sudo systemctl start mongod
    sudo systemctl enable mongod
    print_status "MongoDB installed and started"
else
    print_status "MongoDB already installed"
    sudo systemctl start mongod
fi

echo ""
echo "Step 4: Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
    sudo systemctl start nginx
    sudo systemctl enable nginx
    print_status "Nginx installed and started"
else
    print_status "Nginx already installed"
fi

echo ""
echo "Step 5: Installing PM2 process manager..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    print_status "PM2 installed"
else
    print_status "PM2 already installed"
fi

echo ""
echo "Step 6: Installing Git..."
if ! command -v git &> /dev/null; then
    sudo apt install -y git
    print_status "Git installed"
else
    print_status "Git already installed"
fi

echo ""
echo "Step 7: Setting up application directories..."
APP_DIR="/home/$USER/IOT"

if [ ! -d "$APP_DIR" ]; then
    print_warning "Application directory not found at $APP_DIR"
    echo "Please clone your repository or upload files to: $APP_DIR"
    echo "Example: git clone https://github.com/yourusername/IOT.git $APP_DIR"
    exit 1
fi

cd $APP_DIR
print_status "Found application at $APP_DIR"

echo ""
echo "Step 8: Checking environment configuration..."
if [ ! -f "$APP_DIR/server/.env" ]; then
    print_warning ".env file not found!"
    echo "Creating template .env file..."
    
    cat > $APP_DIR/server/.env << 'EOF'
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/prescriptions
CLIENT_ORIGIN=http://YOUR_VM_IP_HERE
JWT_SECRET=GENERATE_WITH_CRYPTO_RANDOMYTES
NODE_ENV=production

# Azure Document Intelligence
AZURE_DOC_INTELLIGENCE_ENDPOINT=YOUR_ENDPOINT_HERE
AZURE_DOC_INTELLIGENCE_KEY=YOUR_KEY_HERE

# Groq API
GROQ_API_KEY=YOUR_GROQ_KEY_HERE
EOF
    
    print_warning "Please edit server/.env with your actual values"
    print_warning "Generate JWT secret with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    exit 1
else
    print_status ".env file found"
fi

echo ""
echo "Step 9: Installing backend dependencies..."
cd $APP_DIR/server
npm install --production
print_status "Backend dependencies installed"

echo ""
echo "Step 10: Installing frontend dependencies..."
cd $APP_DIR/client
npm install
print_status "Frontend dependencies installed"

echo ""
echo "Step 11: Building frontend..."
npm run build
print_status "Frontend built successfully"

echo ""
echo "Step 12: Configuring Nginx..."

# Get the VM's public IP
PUBLIC_IP=$(curl -s ifconfig.me)
print_status "Detected public IP: $PUBLIC_IP"

sudo tee /etc/nginx/sites-available/prescription-app > /dev/null << EOF
server {
    listen 80;
    server_name $PUBLIC_IP;

    # Frontend - Serve React build
    location / {
        root $APP_DIR/client/dist;
        try_files \$uri \$uri/ /index.html;
        
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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeouts for file uploads
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Increase max upload size for prescription images
    client_max_body_size 10M;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/prescription-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
print_status "Nginx configured"

echo ""
echo "Step 13: Starting application with PM2..."
cd $APP_DIR/server

# Stop existing PM2 processes if any
pm2 delete prescription-api 2>/dev/null || true

# Start the application
pm2 start src/index.js --name "prescription-api" --env production
pm2 save
print_status "Application started with PM2"

echo ""
echo "Step 14: Configuring PM2 startup..."
pm2 startup | tail -n 1 | sudo bash
print_status "PM2 configured to start on boot"

echo ""
echo "Step 15: Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
echo "y" | sudo ufw enable
print_status "Firewall configured"

echo ""
echo "========================================="
echo "Deployment Complete! 🎉"
echo "========================================="
echo ""
echo "Your application is now live at:"
echo "  Frontend: http://$PUBLIC_IP"
echo "  API: http://$PUBLIC_IP/api/health"
echo ""
echo "Useful commands:"
echo "  pm2 list              - View running processes"
echo "  pm2 logs              - View application logs"
echo "  pm2 restart all       - Restart all processes"
echo "  sudo systemctl status nginx    - Check Nginx status"
echo "  sudo systemctl status mongod   - Check MongoDB status"
echo ""
echo "Next steps:"
echo "1. Test your application in the browser"
echo "2. Point your domain to this IP (optional)"
echo "3. Set up SSL with: sudo certbot --nginx -d yourdomain.com"
echo "4. Configure MongoDB authentication (see AZURE_VM_DEPLOYMENT.md)"
echo ""
print_warning "Don't forget to configure automated backups!"
