# Quick Setup Guide for Claude Slack Bot

Since you have the Slack CLI installed and authenticated, here's the quickest way to get your bot running:

## 1. Create the App via Web UI

1. Open https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From an app manifest"
4. Select your workspace "will-regelmann-dev"
5. Copy and paste the contents of `manifest.yml`
6. Click "Next" and then "Create"

## 2. Get Your Tokens

After the app is created:

1. Go to "Basic Information" → "Install your app" → Click "Install to Workspace"
2. Go to "OAuth & Permissions" → Copy the **Bot User OAuth Token** (starts with `xoxb-`)
3. Go to "Basic Information" → "App-Level Tokens" → Click "Generate Token and Scopes"
   - Token Name: "Socket Mode"
   - Add scope: `connections:write`
   - Click "Generate"
   - Copy the **App-Level Token** (starts with `xapp-`)
4. Go to "Basic Information" → Copy the **Signing Secret**

## 3. Configure Your Bot

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your tokens:
# SLACK_BOT_TOKEN=xoxb-your-token-here
# SLACK_APP_TOKEN=xapp-your-token-here
# SLACK_SIGNING_SECRET=your-signing-secret-here
```

## 4. Start the Bot

```bash
# Install dependencies if you haven't already
npm install

# Start the bot
npm start
```

## 5. Test the Bot

In your Slack workspace:
- Send a DM to the bot: "claude help"
- In any channel: "@Claude Bot help"
- Use slash command: "/claude help"

The bot should respond!