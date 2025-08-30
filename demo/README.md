# 🔐 Vault Demo App

A demonstration application showcasing Vault's universal preference management system with instant UI personalization.

## What This Demo Shows

This demo application demonstrates the core value proposition of Vault:
- **Zero Cold Start**: No configuration required for new users
- **Instant Personalization**: AI analyzes preferences and applies them immediately
- **Cross-App Compatibility**: Preferences learned in one app work everywhere
- **Privacy-First**: Client-side embedding generation and analysis

## Features

### 🔑 OAuth Flow
- Complete OAuth 2.0 integration with Vault
- Secure token exchange and storage
- Proper redirect handling

### 🧠 AI-Powered Analysis  
- Web LLM integration for preference parsing
- Semantic similarity matching via embeddings
- JSON mode output for structured preference extraction

### 🎨 Live UI Personalization
- **Dark Mode**: Automatically applied based on user preferences
- **Font Size**: Large fonts enabled for users who prefer better readability
- **Real-time Updates**: UI changes instantly when preferences are detected

### 🔒 Privacy & Security
- Client-side embedding generation
- Secure token management
- No raw preference text sent to external services

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **AI**: Web LLM (@mlc-ai/web-llm)
- **Authentication**: OAuth 2.0 with Vault backend
- **Embeddings**: Custom semantic embedding service

## Setup Instructions

### 1. Prerequisites

Ensure the Vault backend is running:
```bash
cd ../backend
python main.py
```

### 2. Database Setup

Run the database seeder to create the demo OAuth client:
```bash
cd ../backend
python seed/seed_database.py
```

This will create:
- Demo app entry in the database
- OAuth client with ID: `vault_demo_client_123789`
- Sample UI preferences for the demo user

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Demo

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) (note the different port to avoid conflicts).

## How It Works

### 1. Authentication Flow
```
User clicks "Connect with Vault" 
→ Redirect to Vault OAuth server
→ User authorizes the demo app
→ Callback with authorization code
→ Exchange code for access token
→ Store token locally
```

### 2. Preference Analysis
```
Generate embeddings for UI queries:
- "dark mode theme preference"  
- "large font size text readability"
- "UI accessibility preferences"

→ Query Vault API with embeddings
→ Get similarity scores for each query
→ Feed results to Web LLM for parsing
→ Extract boolean preferences (darkMode, largeFonts)
→ Apply to UI instantly
```

### 3. UI Application
```
Preferences detected:
{ darkMode: true, largeFonts: true }

→ Apply dark theme classes
→ Increase font sizes
→ Update color schemes
→ Show preference status
```

## API Integration

### OAuth Endpoints
- **Authorization**: `GET /api/oauth/authorize`
- **Token Exchange**: `POST /api/oauth/token`

### Preference Endpoints  
- **Query**: `POST /api/preferences/query`

### Demo Configuration
- **Client ID**: `vault_demo_client_123789`
- **Redirect URI**: `http://localhost:3001/auth/callback`
- **Scopes**: `read:preferences write:preferences`

## Demo User

The seeded demo user has sample UI preferences:
- "Dark themes are easier on my eyes, especially at night" (strength: 3.4)
- "Large, readable fonts are essential for comfortable reading" (strength: 2.5)
- "Minimal, clean interfaces without clutter or animations" (strength: 2.2)

## Files Structure

```
demo/
├── app/
│   ├── page.tsx              # Main demo application  
│   ├── layout.tsx            # Root layout
│   └── auth/callback/        # OAuth callback handler
├── lib/
│   └── embedding-service.ts  # Simple embedding generation
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## Development Notes

### Web LLM Integration
The demo uses Web LLM for client-side AI analysis. The model loads in the browser and processes preference data locally for privacy.

### Embedding Generation
For demo purposes, we use a simplified embedding service. Production apps would use proper embedding models like:
- Snowflake Arctic Embed
- OpenAI text-embedding-ada-002  
- Sentence Transformers

### Error Handling
The app includes fallback logic if:
- Web LLM fails to load
- OAuth flow encounters issues
- API requests fail
- JSON parsing errors occur

## Next Steps

To extend this demo:
1. Add more preference categories (entertainment, shopping, etc.)
2. Implement preference learning from user interactions
3. Add more complex UI personalizations
4. Integrate real embedding models
5. Add preference contribution features

## License

Part of the Vault Universal Preference Manager project.