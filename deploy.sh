#!/bin/bash
# deploy.sh — Run this ON your VPS to set up or update the project tracker bot.
# Usage: bash deploy.sh
set -e

REPO_URL="https://github.com/jeffwarr4/project-tracker.git"
APP_DIR="/opt/project-tracker"
APP_NAME="project-tracker"
NODE_VERSION="20"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()    { echo -e "${GREEN}[deploy]${NC} $1"; }
warning() { echo -e "${YELLOW}[deploy]${NC} $1"; }

# ── 1. System packages ────────────────────────────────────────────────────────
info "Updating system packages..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl git build-essential

# ── 2. Node.js ────────────────────────────────────────────────────────────────
if ! command -v node &>/dev/null || [[ "$(node -e 'process.stdout.write(process.versions.node.split(".")[0])')" -lt "$NODE_VERSION" ]]; then
  info "Installing Node.js ${NODE_VERSION}.x..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  info "Node.js $(node --version) already installed — skipping."
fi

# ── 3. PM2 ───────────────────────────────────────────────────────────────────
if ! command -v pm2 &>/dev/null; then
  info "Installing PM2..."
  sudo npm install -g pm2
else
  info "PM2 $(pm2 --version) already installed — skipping."
fi

# ── 4. Clone or update repo ───────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  info "Repo already cloned — pulling latest changes..."
  cd "$APP_DIR"
  git pull origin main
else
  info "Cloning repository to $APP_DIR..."
  sudo git clone "$REPO_URL" "$APP_DIR"
  sudo chown -R "$USER:$USER" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 5. Install dependencies ───────────────────────────────────────────────────
info "Installing npm dependencies..."
npm install --omit=dev

# ── 6. Create .env if it doesn't exist ───────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  info "Creating .env template — fill in your values before starting the bot."
  cat > "$APP_DIR/.env" << 'EOF'
# Telegram Bot Token — get from @BotFather on Telegram
TELEGRAM_BOT_TOKEN=

# OpenAI API Key — used for voice transcription (Whisper)
OPENAI_API_KEY=

# Anthropic API Key — used for message parsing (Claude)
ANTHROPIC_API_KEY=

# Google Sheets ID — the long ID from your sheet's URL
GOOGLE_SHEETS_ID=

# Path to Google service account credentials JSON
GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json

# Telegram user IDs allowed to use this bot (comma-separated)
ALLOWED_USER_IDS=

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=

# Phone numbers for user identification (with country code, e.g. +12125551234)
PHONE_JEFF=
PHONE_PARTNER=

# Display names recorded in Google Sheets
NAME_JEFF=Jeff
NAME_PARTNER=Partner

# Active messaging channel: telegram | whatsapp | telegram+whatsapp | all
MESSAGING_PLATFORM=telegram

# Express webhook server port (used for WhatsApp/SMS)
PORT=3000
EOF
  warning ".env created with placeholders — fill in your credentials before starting."
else
  info ".env already exists — leaving it untouched."
fi

# ── 7. Create config dir for Google credentials ───────────────────────────────
mkdir -p "$APP_DIR/config"
if [ ! -f "$APP_DIR/config/google-credentials.json" ]; then
  warning "config/google-credentials.json is missing — copy it manually before starting."
fi

# ── 8. Start or restart with PM2 ─────────────────────────────────────────────
if pm2 list | grep -q "$APP_NAME"; then
  info "Restarting existing PM2 process..."
  pm2 restart "$APP_NAME"
else
  info "Starting app with PM2..."
  cd "$APP_DIR"
  pm2 start src/index.js --name "$APP_NAME"
fi

# ── 9. Save PM2 config and enable startup ────────────────────────────────────
pm2 save
sudo env PATH="$PATH:/usr/bin" pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash || true

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deploy complete! Next steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Fill in credentials:"
echo "       nano $APP_DIR/.env"
echo ""
echo "  2. Upload Google service account key:"
echo "       scp google-credentials.json user@yourserver:$APP_DIR/config/"
echo ""
echo "  3. If using WhatsApp, register your webhook URL in the Meta dashboard:"
echo "       https://YOUR_DOMAIN_OR_IP:3000/whatsapp"
echo "       (consider putting nginx in front on port 443)"
echo ""
echo "  4. Restart after editing .env:"
echo "       pm2 restart $APP_NAME"
echo ""
echo "  5. Watch logs:"
echo "       pm2 logs $APP_NAME"
echo ""
