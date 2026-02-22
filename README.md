# Call-GPT

A Twilio voice AI application for automated phone call handling with OpenAI GPT-4 and Deepgram speech processing.

## Features

- **Real-time Speech-to-Text**: Powered by Deepgram Nova-2
- **AI Conversation**: OpenAI GPT-4 for natural language understanding
- **Text-to-Speech**: Deepgram TTS for natural voice responses
- **CRM Integration**: Zoho CRM with a ZDK-compatible client adapter for lead and event workflows
- **Session Management**: Pluggable state backends (Firestore, Redis, or in-memory)

## Architecture

```
src/
├── app.ts                    # Application entry point
├── config/                   # Configuration management
│   ├── env.ts               # Environment variable utilities
│   ├── index.ts             # Config exports
│   └── validateEnv.ts       # Environment validation
├── http/                     # HTTP/WebSocket routes
│   ├── connectionRouter.ts  # WebSocket connection handling
│   └── incomingRouter.ts    # Twilio webhook endpoint
├── services/                 # Core services
│   ├── gpt-service.ts       # OpenAI integration
│   ├── transcription-service.ts  # Deepgram STT
│   ├── tts-service.ts       # Deepgram TTS
│   ├── stream-service.ts    # Audio stream management
│   └── recording-service.ts # Call recording
├── session/                  # Session management
│   └── CallSessionManager.ts
├── state/                    # State persistence
│   ├── createSessionStore.ts
│   ├── FirestoreSessionStore.ts
│   ├── RedisSessionStore.ts
│   └── MemorySessionStore.ts
├── tools/                    # Tool definitions & handlers
│   ├── tool-definitions.ts  # Tool metadata
│   ├── manifest.ts          # OpenAI tool manifest
│   ├── registry.ts          # Tool handler registry
│   └── handlers/            # Tool implementations
│       ├── checkAvailability.ts
│       ├── createCRMLeadAndEvent.ts
│       ├── listAppointmentTypes.ts
│       ├── listStaffMembers.ts
│       └── zoho_*.ts        # Zoho CRM integration
├── integrations/             # External integrations
│   └── zoho/                # Zoho CRM client
└── types/                    # TypeScript type definitions
    └── index.ts
```

## Prerequisites

- Node.js >= 18
- Redis (optional, for session persistence)
- Twilio account with phone number
- OpenAI API key
- Deepgram API key
- Zoho CRM account (for CRM features)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file with the following variables:

```env
# Required
DEEPGRAM_API_KEY=your_deepgram_api_key
VOICE_MODEL=aura-asteria-en
OPENAI_API_KEY=your_openai_api_key

# Optional
PORT=8080
OPENAI_MODEL=gpt-4o-mini
RECORDING_ENABLED=false

# Twilio (if recording enabled)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token

# Zoho CRM
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_APPOINTMENT_TYPES=[{"id":"1","name":"Consultation"}]
ZOHO_STAFF_MEMBERS=[{"id":"1","name":"Staff Name"}]

# Session persistence backend (local dev default)
SESSION_STORE_BACKEND=memory

# Memory backend
# Process-local, non-persistent state. Data is lost on restart.
SESSION_STORE_BACKEND=memory

# Redis backend
SESSION_STORE_BACKEND=redis
REDIS_URL=redis://localhost:6379

# Firestore backend
SESSION_STORE_BACKEND=firestore
GOOGLE_CLOUD_PROJECT=your_project
FIRESTORE_COLLECTION=call_sessions
FIRESTORE_DATABASE=(default)
GCP_ACCESS_TOKEN=oauth_bearer_token
```

### Session backend selection and fallback

When `SESSION_STORE_BACKEND` is unset (or invalid), backend resolution follows this precedence:

1. `REDIS_URL` present → `redis`
2. `GOOGLE_CLOUD_PROJECT` present → `firestore`
3. Otherwise → `memory`

An explicit valid `SESSION_STORE_BACKEND` (`memory`, `redis`, `firestore`) always overrides fallback detection.

## Development

```bash
# Start development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Run tests
npm test
```

## Production

```bash
# Build
npm run build

# Start production server
npm start
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/incoming` | POST | Twilio webhook for incoming calls |
| `/connection` | WS | WebSocket for media stream |
| `/healthz` | GET | Health check endpoint |
| `/readyz` | GET | Readiness check endpoint |

## Deployment

See `deploy/` directory for Docker and Kubernetes deployment configurations.

## License

MIT
