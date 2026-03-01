# PowerShell Script to Upload Files to Azure VM
# Run this script from your local Windows machine

param(
    [Parameter(Mandatory=$false)]
    [string]$VMIpAddress,
    
    [Parameter(Mandatory=$false)]
    [string]$VMUsername = "azureuser",
    
    [Parameter(Mandatory=$false)]
    [string]$PrivateKeyPath
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Azure VM File Upload Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SCP is available
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] SCP not found. Please install OpenSSH Client:" -ForegroundColor Red
    Write-Host "  Settings > Apps > Optional Features > Add a feature > OpenSSH Client" -ForegroundColor Yellow
    exit 1
}

# Get VM IP if not provided
if (-not $VMIpAddress) {
    $VMIpAddress = Read-Host "Enter your Azure VM Public IP Address"
}

# Get username if not provided
$VMUsername = Read-Host "Enter VM username (default: azureuser)" 
if ([string]::IsNullOrWhiteSpace($VMUsername)) {
    $VMUsername = "azureuser"
}

# Check if using SSH key or password
$useKey = Read-Host "Are you using SSH key authentication? (y/n, default: n)"
if ($useKey -eq "y") {
    if (-not $PrivateKeyPath) {
        $PrivateKeyPath = Read-Host "Enter path to your private key file"
    }
    
    if (-not (Test-Path $PrivateKeyPath)) {
        Write-Host "[ERROR] Private key not found at: $PrivateKeyPath" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[INFO] Preparing to upload application files..." -ForegroundColor Green
Write-Host "  Target VM: $VMUsername@$VMIpAddress" -ForegroundColor Cyan

# Get current directory (should be IOT folder)
$currentPath = Get-Location
Write-Host "  Source: $currentPath" -ForegroundColor Cyan
Write-Host ""

# Exclude folders
$excludeItems = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    "logs",
    ".vscode",
    ".idea"
)

Write-Host "Creating temporary upload package..." -ForegroundColor Yellow

# Create a temporary directory
$tempDir = Join-Path $env:TEMP "iot-upload-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copy files excluding unnecessary folders
Write-Host "Copying files (excluding node_modules, .git, etc.)..." -ForegroundColor Yellow

$filesToCopy = Get-ChildItem -Path $currentPath -Recurse -File | Where-Object {
    $file = $_
    $exclude = $false
    foreach ($item in $excludeItems) {
        if ($file.FullName -like "*\$item\*") {
            $exclude = $true
            break
        }
    }
    -not $exclude
}

$totalFiles = $filesToCopy.Count
$counter = 0

foreach ($file in $filesToCopy) {
    $counter++
    Write-Progress -Activity "Copying files" -Status "$counter of $totalFiles" -PercentComplete (($counter / $totalFiles) * 100)
    
    $relativePath = $file.FullName.Replace($currentPath, "").TrimStart("\")
    $destPath = Join-Path $tempDir $relativePath
    $destDir = Split-Path $destPath -Parent
    
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $file.FullName -Destination $destPath -Force
}

Write-Progress -Activity "Copying files" -Completed

Write-Host "[✓] Files copied to temporary location: $tempDir" -ForegroundColor Green
Write-Host ""

# Compress files
Write-Host "Compressing files..." -ForegroundColor Yellow
$zipFile = Join-Path $env:TEMP "iot-upload.zip"
if (Test-Path $zipFile) {
    Remove-Item $zipFile -Force
}

Compress-Archive -Path "$tempDir\*" -DestinationPath $zipFile -Force
Write-Host "[✓] Files compressed: $zipFile" -ForegroundColor Green

$zipSize = (Get-Item $zipFile).Length / 1MB
Write-Host "  Package size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
Write-Host ""

# Upload file to VM
Write-Host "Uploading to Azure VM..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes depending on your connection..." -ForegroundColor Gray
Write-Host ""

try {
    if ($useKey -eq "y") {
        scp -i $PrivateKeyPath $zipFile "${VMUsername}@${VMIpAddress}:/home/$VMUsername/iot-upload.zip"
    } else {
        scp $zipFile "${VMUsername}@${VMIpAddress}:/home/$VMUsername/iot-upload.zip"
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[✓] Upload successful!" -ForegroundColor Green
    } else {
        throw "Upload failed with exit code: $LASTEXITCODE"
    }
} catch {
    Write-Host "[ERROR] Upload failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Extracting files on VM..." -ForegroundColor Yellow

$extractCommands = @"
cd /home/$VMUsername
unzip -o iot-upload.zip -d IOT
rm iot-upload.zip
cd IOT
chmod +x deploy-azure-vm.sh
echo 'Files extracted successfully!'
ls -la
"@

try {
    if ($useKey -eq "y") {
        $extractCommands | ssh -i $PrivateKeyPath "${VMUsername}@${VMIpAddress}" bash
    } else {
        $extractCommands | ssh "${VMUsername}@${VMIpAddress}" bash
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[✓] Files extracted successfully!" -ForegroundColor Green
    } else {
        throw "Extraction failed with exit code: $LASTEXITCODE"
    }
} catch {
    Write-Host "[ERROR] Extraction failed: $_" -ForegroundColor Red
    Write-Host "You may need to manually extract the file on the VM:" -ForegroundColor Yellow
    Write-Host "  ssh $VMUsername@$VMIpAddress" -ForegroundColor Cyan
    Write-Host "  unzip -o iot-upload.zip -d IOT" -ForegroundColor Cyan
}

# Clean up
Write-Host ""
Write-Host "Cleaning up temporary files..." -ForegroundColor Yellow
Remove-Item $zipFile -Force
Remove-Item $tempDir -Recurse -Force
Write-Host "[✓] Cleanup complete" -ForegroundColor Green

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Upload Complete! 🎉" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. SSH into your VM:" -ForegroundColor White
if ($useKey -eq "y") {
    Write-Host "   ssh -i $PrivateKeyPath $VMUsername@$VMIpAddress" -ForegroundColor Cyan
} else {
    Write-Host "   ssh $VMUsername@$VMIpAddress" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "2. Configure .env file:" -ForegroundColor White
Write-Host "   cd IOT/server" -ForegroundColor Cyan
Write-Host "   nano .env" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. Run deployment script:" -ForegroundColor White
Write-Host "   cd /home/$VMUsername/IOT" -ForegroundColor Cyan
Write-Host "   chmod +x deploy-azure-vm.sh" -ForegroundColor Cyan
Write-Host "   ./deploy-azure-vm.sh" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Or follow manual steps in AZURE_VM_DEPLOYMENT.md" -ForegroundColor White
Write-Host ""
