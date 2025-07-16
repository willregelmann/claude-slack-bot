#!/bin/bash

# Claude Slack Service Installation Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root!${NC}"
   echo "Run it as your normal user and it will use sudo when needed."
   exit 1
fi

echo -e "${BLUE}Installing Claude Slack Service...${NC}"

# Stop and disable old single-agent service if it exists
if systemctl is-active --quiet claude-slack-bot 2>/dev/null; then
    echo -e "${YELLOW}Stopping old single-agent service...${NC}"
    sudo systemctl stop claude-slack-bot
    sudo systemctl disable claude-slack-bot
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing npm dependencies...${NC}"
    npm install
fi

# Update the service file with current user and paths
echo -e "${YELLOW}Configuring service file...${NC}"
sed -i "s|User=will|User=$USER|g" claude-slack.service
sed -i "s|Group=will|Group=$USER|g" claude-slack.service
sed -i "s|/home/will|$HOME|g" claude-slack.service

# Copy service file to systemd directory
echo -e "${YELLOW}Installing service file...${NC}"
sudo cp claude-slack.service /etc/systemd/system/

# Reload systemd
echo -e "${YELLOW}Reloading systemd...${NC}"
sudo systemctl daemon-reload

# Enable the service
echo -e "${YELLOW}Enabling service...${NC}"
sudo systemctl enable claude-slack.service

echo -e "${GREEN}Claude Slack service installed successfully!${NC}"
echo ""
echo -e "${BLUE}How to use:${NC}"
echo ""
echo -e "${YELLOW}1. Start your agents:${NC}"
echo "   claude-slack start --alias=\"attic-ui\" --dir=\"/home/will/Projects/attic/attic-ui\" --port=3000"
echo "   claude-slack start --alias=\"backend\" --dir=\"/home/will/Projects/my-backend\" --port=3001"
echo ""
echo -e "${YELLOW}2. Start the service:${NC}"
echo "   sudo systemctl start claude-slack"
echo ""
echo -e "${YELLOW}3. The service will remember and restart your agents on boot${NC}"
echo ""
echo "Useful commands:"
echo "  sudo systemctl status claude-slack    # Check status"
echo "  sudo systemctl stop claude-slack      # Stop service"
echo "  sudo systemctl start claude-slack     # Start service"
echo "  sudo systemctl restart claude-slack   # Restart service"
echo "  sudo systemctl reload claude-slack    # Reload agents"
echo "  sudo journalctl -u claude-slack -f    # View logs"
echo "  claude-slack list                                # List agents"
echo ""
echo -e "${GREEN}The service will automatically save and restore your running agents!${NC}"