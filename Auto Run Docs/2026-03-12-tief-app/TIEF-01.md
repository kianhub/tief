# TIEF-01: Project Scaffolding & User Action Items

> Foundation: Expo SDK 55 project with all dependencies, directory structure, configuration, and user action documents.

## Prerequisites
- Node.js 20+, npm/yarn installed
- Working directory: `/Users/kian/Developer/tief`

## Available Tools
Use these tools proactively throughout this phase:
- **context7 MCP** (`/context7`): Look up latest Expo SDK 55, expo-router v7, and any dependency docs before writing config. Example: resolve `expo` then query "app.json configuration SDK 55" or "expo-router v7 project setup".
- **Skill: `expo-app-design:building-native-ui`**: Invoke for guidance on Expo Router project structure, app config, and navigation setup.
- **Skill: `expo-app-design:expo-dev-client`**: Reference for EAS build configuration and development client setup.

---

- [x] **Scaffold Expo SDK 55 project and install all dependencies.** The working directory `/Users/kian/Developer/tief` already exists as a git repo with `tief-product-spec.md`. Initialize the Expo project IN this directory (not a subdirectory). Run `npx create-expo-app@latest . --template blank-typescript` (use `.` for current dir). If that fails due to existing files, create in a temp dir and move contents. Then immediately install all required dependencies:

```bash
# Core Expo SDK 55 packages
npx expo install expo-router expo-sqlite expo-notifications expo-secure-store expo-haptics expo-audio expo-linking expo-constants expo-font expo-splash-screen expo-status-bar expo-image expo-crypto expo-file-system expo-sharing expo-apple-authentication

# ElevenLabs + LiveKit (voice)
npm install @elevenlabs/react-native @livekit/react-native @livekit/react-native-webrtc livekit-client

# Supabase
npm install @supabase/supabase-js

# Animation & Graphics
npx expo install react-native-reanimated react-native-gesture-handler
npm install @shopify/react-native-skia

# Navigation (Expo Router v7 deps)
npx expo install react-native-screens react-native-safe-area-context

# Markdown rendering
npm install react-native-markdown-display

# Date handling
npm install date-fns

# UUID generation
npm install uuid && npm install -D @types/uuid
```

After installing, verify with `npx expo doctor` (fix any version mismatches). The project should compile without errors.

- [ ] **Replace ESLint with oxlint.** The `create-expo-app` template may include ESLint by default. Remove it and set up oxlint instead:

1. Remove ESLint and related packages:
```bash
npm uninstall eslint @eslint/js typescript-eslint eslint-config-expo eslint-plugin-react-hooks eslint-plugin-react 2>/dev/null || true
rm -f .eslintrc.js .eslintrc.json eslint.config.js eslint.config.mjs
```

2. Install oxlint as a dev dependency:
```bash
npm install -D oxlint
```

3. Generate the config file and then customize it:
```bash
npx oxlint --init
```
This creates `.oxlintrc.json`. Replace its contents with:
```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["import", "typescript", "react", "react-perf", "jsx-a11y"],
  "env": {
    "browser": true,
    "es2024": true
  },
  "settings": {
    "react": {
      "version": "detect"
    },
    "jsx-a11y": {
      "components": {
        "Pressable": "button",
        "TouchableOpacity": "button"
      }
    }
  },
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "pedantic": "off",
    "nursery": "off"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "eqeqeq": "error",
    "react/self-closing-comp": "error",
    "react/jsx-no-duplicate-props": "error",
    "react/no-direct-mutation-state": "error",
    "import/no-cycle": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn"
  },
  "overrides": [
    {
      "files": ["*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx", "**/__tests__/**"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off"
      }
    },
    {
      "files": ["supabase/functions/**/*.ts"],
      "env": {
        "browser": false
      }
    }
  ],
  "ignorePatterns": [
    "node_modules",
    ".expo",
    "ios",
    "android",
    "dist",
    "*.config.js",
    "*.config.mjs",
    "babel.config.js",
    "metro.config.js"
  ]
}
```

4. Update `package.json` scripts:
```json
{
  "scripts": {
    "lint": "oxlint",
    "lint:fix": "oxlint --fix"
  }
}
```

5. Verify by running `npm run lint` — it should complete without errors on the fresh project.

- [ ] **Create full directory structure per spec §16.** Create all directories and placeholder index files:

```
src/
├── app/                    # Expo Router v7 routes
│   ├── (auth)/
│   ├── (onboarding)/
│   ├── (tabs)/
│   ├── conversation/
│   └── post/
│       └── [id]/
├── components/
│   ├── ui/                 # Design system primitives
│   ├── conversation/       # Voice orb, chat bubbles, mode switcher
│   ├── blog/               # Blog post renderer, editor, library card
│   └── onboarding/         # Onboarding step components
├── lib/                    # Core libraries
├── hooks/                  # Custom hooks
├── constants/              # Theme, voices, categories
└── types/                  # TypeScript types
supabase/
├── migrations/             # SQL migration files
└── functions/
    ├── generate-blog-post/
    ├── generate-prompts/
    ├── dispatch-notifications/
    ├── proxy-claude/
    └── export-blog-markdown/
```

Create each directory with `mkdir -p`. Add a `.gitkeep` in empty leaf directories so git tracks them. Do NOT create any component files yet — only the directory structure.

- [ ] **Configure app.json, eas.json, tsconfig.json, and babel.config.js.** Update the files as follows:

**app.json** — Set:
- `name`: `"tief."`
- `slug`: `"tief"`
- `scheme`: `"tief"`
- `version`: `"1.0.0"`
- `orientation`: `"portrait"`
- `icon`: `"./assets/icon.png"`
- `userInterfaceStyle`: `"automatic"`
- `splash.backgroundColor`: `"#FAF8F5"`
- `ios.supportsTablet`: `false`
- `ios.bundleIdentifier`: `"app.tief.mobile"`
- `ios.infoPlist.NSMicrophoneUsageDescription`: `"tief. needs microphone access for voice conversations"`
- `ios.entitlements`: `{ "aps-environment": "development" }`
- `plugins`: `["expo-router", "expo-secure-store", "expo-notifications", "expo-apple-authentication", ["expo-font", { "fonts": [] }], ["expo-sqlite", {}]]`
- `experiments.typedRoutes`: `true`
- `newArchEnabled`: `true`
- Under `expo-router` plugin config, set `root` to `"src/app"`

**eas.json**:
```json
{
  "cli": { "version": ">= 13.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "development-device": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": false }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {
      "ios": { "appleId": "FILL_IN", "ascAppId": "FILL_IN", "appleTeamId": "FILL_IN" }
    }
  }
}
```

**tsconfig.json** — Extend expo's tsconfig. Add path aliases:
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

**babel.config.js** — Add reanimated plugin (must be last):
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

Also create/update **metro.config.js** if needed for Expo Router:
```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
module.exports = config;
```

Verify the project compiles with `npx expo export --platform ios --dump-sourcemap false` or just `npx tsc --noEmit`.

- [ ] **Create environment configuration with placeholder values.** Create `src/constants/config.ts`:

```typescript
// Environment configuration
// These values must be filled in after setting up external services.
// See /useractions/ for setup instructions.

export const Config = {
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '__SUPABASE_URL__',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '__SUPABASE_ANON_KEY__',
  ELEVENLABS_AGENT_ID: process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID || '__ELEVENLABS_AGENT_ID__',
} as const;
```

Create a `.env.example` file at the project root:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ELEVENLABS_AGENT_ID=your-agent-id
```

Add `.env` and `.env.local` to `.gitignore` (keep `.env.example` tracked).

- [ ] **Create user action documents in `/useractions/` detailing all manual setup steps.** Create the following markdown files:

**`/useractions/01-supabase-setup.md`** — Document these steps:
1. Create a Supabase project at https://supabase.com/dashboard
2. Note the Project URL and anon public key from Settings → API
3. Enable Auth providers: Email (enabled by default), Apple Sign In (requires Apple Developer setup)
4. Run the PostgreSQL schema from the product spec §3.5 in the SQL Editor
5. Enable RLS policies from spec §3.5
6. Create Edge Functions: `generate-blog-post`, `proxy-claude`, `generate-prompts`, `dispatch-notifications`, `export-blog-markdown`
7. Set Edge Function secrets: `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `EXPO_PUSH_ACCESS_TOKEN`
8. Enable Realtime on the `blog_posts` table (Database → Replication → enable `blog_posts`)
9. Set up pg_cron for: `generate-prompts` (daily at 2am UTC), `dispatch-notifications` (every 15 min)

**`/useractions/02-elevenlabs-setup.md`** — Document these steps:
1. Create ElevenLabs account at https://elevenlabs.io
2. Navigate to Conversational AI → Agents → Create new agent (blank template)
3. Set backing LLM to Claude Sonnet via Anthropic API key in ElevenLabs dashboard
4. Configure system prompt per product spec §6.1 (set as default, will be overridden per-session)
5. Enable `onMessage` events for transcript capture
6. Note the Agent ID — this becomes `ELEVENLABS_AGENT_ID`
7. Audition and select 10 voices per spec §15, note each `voice_id`
8. Configure voice settings: `{ stability: 0.4, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true }`

**`/useractions/03-apple-and-eas-setup.md`** — Document these steps:
1. Apple Developer Account: enable Push Notifications capability for bundle ID `app.tief.mobile`
2. Enable Sign In with Apple capability
3. Create APN key (Keys → Create → Apple Push Notifications service) — note Key ID and download .p8 file
4. Upload APN key to Expo: `eas credentials` or via https://expo.dev
5. Run `eas build:configure` to link EAS project
6. Fill in `eas.json` submit section: `appleId`, `ascAppId`, `appleTeamId`
7. Build development client: `eas build --platform ios --profile development-device`
8. Install dev client on physical device via QR code or TestFlight

**`/useractions/04-environment-variables.md`** — Document:
1. Copy `.env.example` to `.env` at project root
2. Fill in `EXPO_PUBLIC_SUPABASE_URL` from Supabase dashboard
3. Fill in `EXPO_PUBLIC_SUPABASE_ANON_KEY` from Supabase dashboard
4. Fill in `EXPO_PUBLIC_ELEVENLABS_AGENT_ID` from ElevenLabs dashboard
5. List all Supabase Edge Function secrets that need to be set via `supabase secrets set`
6. Note: NEVER commit `.env` — it's gitignored. Only `.env.example` is tracked.

Each file should have a title, a brief explanation of why this step is needed, and clear numbered instructions. Mark each instruction with a checkbox `- [ ]` so the user can track completion.
