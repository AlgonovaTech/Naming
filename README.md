# Creative Naming

Minimalist creative uploader that automatically generates naming for User Acquisition creatives using AI analysis.

## Features

- Drag-and-drop file upload (images and videos, 1-20 files)
- AI-powered creative analysis using Claude Haiku Vision via OpenRouter
- Automatic naming generation based on visual content
- Sequential ID assignment without duplicates or gaps
- Google Sheets integration for data storage

## Setup

### 1. Google Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Sheets API
4. Create a Service Account:
   - Go to IAM & Admin → Service Accounts
   - Create new service account
   - Download JSON key
5. Share your Google Sheet with the service account email (Editor access)

### 2. OpenRouter API

1. Sign up at [OpenRouter](https://openrouter.ai/)
2. Get your API key
3. Ensure you have credits for Claude Haiku Vision

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required variables:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Email from service account JSON
- `GOOGLE_PRIVATE_KEY` - Private key from service account JSON (include the `-----BEGIN/END-----` parts)
- `GOOGLE_SPREADSHEET_ID` - ID from your Google Sheet URL
- `GOOGLE_SHEET_NAME` - Name of the sheet tab (default: Sheet1)
- `OPENROUTER_API_KEY` - Your OpenRouter API key

### 4. Google Sheet Structure

The sheet should have these columns (configurable via env):

| Column | Content |
|--------|---------|
| 1 (A) | V_id=\<id\>;type=\<type\> |
| 2 (B) | type (static/video) |
| 3 (C) | name_of_hypothesis |
| 5 (E) | AI flag (made AI / not AI) |
| 6 (F) | style |
| 7 (G) | main_ton |
| 8 (H) | main_object |
| 9 (I) | filename |

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## API

### POST /api/upload-creatives

Upload creatives for processing.

**Request:** FormData with `files[]` containing image/video files

**Response:**
```json
{
  "status": "ok",
  "results": [
    {
      "name": "file1.png",
      "creativeId": 4321,
      "rowIndex": 4225
    }
  ]
}
```

**Error:**
```json
{
  "status": "error",
  "error": "Error message"
}
```

## AI Analysis Fields

| Field | Values |
|-------|--------|
| type | static, video |
| name_of_hypothesis | city, paper, kids, statue, banner, offline, etc. |
| made_ai | made AI, not AI |
| style | Real, 3D, Illustration, Minecraft style, Pixar style, Cartoon, Other |
| main_ton | bright, light, dark, soft, neutral |
| main_object | city, boy, girl, boy_girl, statue, building, object, people, offline, none, other |

## Sequential ID Guarantee

IDs are guaranteed to be:
- Strictly sequential (no gaps)
- Unique (no duplicates)
- Thread-safe (works with parallel uploads)

This is achieved via in-memory mutex locking on the backend.

