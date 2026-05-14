# Project Tracker Bot

A Telegram bot that lets two people track projects, log updates, and record time — all via text or voice notes. Messages are parsed by Claude AI and saved to a Google Sheet with "Projects" and "Time Log" tabs.

## How it works

1. Send a text or voice message to your Telegram bot
2. Claude AI classifies the message as: new project, project update, or time log
3. Data is written to Google Sheets
4. Bot sends a confirmation back

**Example messages:**
- `"New project for Acme Corp — website redesign, estimated 20 hours"` → creates a new project row
- `"Acme website is on hold, client pausing for budget"` → updates project status
- `"Spent 3 hours on Acme, finished the homepage mockup"` → logs time

---

## Setup

### 1. Prerequisites

- Node.js 18 or later
- A Telegram account
- An OpenAI account (for voice transcription)
- An Anthropic account (for message parsing)
- A Google account with Google Sheets access

---

### 2. Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts
3. Copy the bot token (looks like `123456789:ABCdef...`)
4. Find your own Telegram user ID by messaging **@userinfobot**

---

### 3. Set up Google Sheets

#### Create the spreadsheet
1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/**THIS_PART**/edit`
3. The bot will automatically create the "Projects" and "Time Log" tabs on first run

#### Create a service account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Enable the **Google Sheets API**: APIs & Services → Enable APIs → search "Google Sheets API"
4. Go to **APIs & Services → Credentials → Create Credentials → Service Account**
5. Give it any name, click through to the end
6. Click the service account you just created → **Keys** tab → **Add Key → Create new key → JSON**
7. Save the downloaded JSON file as `config/google-credentials.json` in this project
8. **Share your spreadsheet** with the service account's email address (found in the JSON file as `client_email`). Give it **Editor** access.

---

### 4. Install dependencies

```bash
cd project-tracker
npm install
```

---

### 5. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
OPENAI_API_KEY=your_openai_key          # for voice note transcription
ANTHROPIC_API_KEY=your_anthropic_key    # for message parsing
GOOGLE_SHEETS_ID=your_spreadsheet_id
GOOGLE_CREDENTIALS_PATH=./config/google-credentials.json
ALLOWED_USER_IDS=your_telegram_id,partner_telegram_id
```

---

### 6. Run the bot

```bash
npm start
```

Or in dev mode (auto-restarts on file changes):
```bash
npm run dev
```

On first run, the bot will automatically create the two sheet tabs with headers.

---

## Running tests

### Test AI message parsing (requires ANTHROPIC_API_KEY)
```bash
npm test
```
Runs 10 sample messages through Claude and shows the parsed output. No sheets are touched.

### Test Google Sheets integration (writes real data!)
```bash
npm run test:sheets
```
Creates a test project, updates it, logs time, then confirms. Use a throwaway sheet ID.

---

## Google Sheets structure

### Projects tab
| Column | Description |
|--------|-------------|
| Project ID | Auto-generated (PRJ-001, PRJ-002, ...) |
| Project Name | Name of the project |
| Client | Client or company name |
| Status | active / on-hold / completed / cancelled |
| Description | What the project involves |
| Documents Needed | Comma-separated list |
| Estimated Hours | Total estimated hours |
| Hours Logged | Running total (auto-updated when time is logged) |
| Last Updated | Date of last change |

### Time Log tab
| Column | Description |
|--------|-------------|
| Project ID | Links to Projects tab |
| Date | Date the work was done (auto-set to today) |
| Hours | Hours logged in this entry |
| Description | What was worked on |
| Logged By | Telegram first name of who sent the message |

---

## Deployment options

### Option A: Node.js server (direct)

Run on any VPS, Raspberry Pi, or cloud instance:
```bash
npm start
```

For production, use a process manager:
```bash
npm install -g pm2
pm2 start src/index.js --name project-tracker
pm2 save
pm2 startup
```

### Option B: n8n workflow (no-code alternative)

Import `n8n/workflow.json` into your n8n instance:

1. Go to your n8n dashboard → **Workflows → Import from file**
2. Select `n8n/workflow.json`
3. Configure credentials in each node:
   - **Telegram Bot** credential with your bot token
   - **OpenAI API** header auth credential
   - **Anthropic API** header auth credential  
   - **Google Sheets OAuth2** credential
4. Set environment variables in n8n settings:
   - `TELEGRAM_BOT_TOKEN`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_SHEETS_ID`
5. Activate the workflow

The n8n workflow mirrors the same logic: Telegram trigger → voice detection → Whisper transcription → Claude parsing → Google Sheets write → Telegram reply.

---

## Security

- The bot only responds to Telegram user IDs listed in `ALLOWED_USER_IDS`
- `config/google-credentials.json` is gitignored — never commit it
- `.env` is gitignored — never commit it
- The Google service account only has access to sheets you explicitly share with it

---

## Troubleshooting

**Bot doesn't respond**
- Check `TELEGRAM_BOT_TOKEN` is correct
- Make sure `ALLOWED_USER_IDS` includes your Telegram ID (get it from @userinfobot)

**Google Sheets write fails**
- Verify the service account email has Editor access to your sheet
- Check `GOOGLE_SHEETS_ID` matches the sheet URL
- Confirm `config/google-credentials.json` exists and is valid JSON

**Voice notes not working**
- Verify `OPENAI_API_KEY` is set and has Whisper API access
- Voice notes over ~25MB may fail — this is an OpenAI limit

**AI misclassifies messages**
- Add the project name explicitly in your message
- Use trigger words: "new project", "log X hours", "update", "on hold"
- Check `tests/test-messages.js` for examples of how the AI interprets messages
