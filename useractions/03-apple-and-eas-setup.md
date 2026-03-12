---
type: reference
title: Apple Developer & EAS Build Setup
created: 2026-03-12
tags:
  - setup
  - apple
  - eas
  - ios
related:
  - '[[01-supabase-setup]]'
  - '[[04-environment-variables]]'
---

# Apple Developer & EAS Build Setup

tief. requires an Apple Developer account for push notifications, Sign In with Apple, and distributing development builds to physical iOS devices. EAS (Expo Application Services) handles the build pipeline and credentials management.

A physical device is required for testing voice conversations (microphone access), push notifications, and the ElevenLabs native SDK.

---

## Steps

- [ ] **1. Enable Push Notifications capability**
  - Log in to https://developer.apple.com
  - Go to **Certificates, Identifiers & Profiles → Identifiers**
  - Find or create the App ID with bundle identifier `app.tief.mobile`
  - Under **Capabilities**, enable **Push Notifications**
  - Save the changes

- [ ] **2. Enable Sign In with Apple capability**
  - In the same App ID configuration (`app.tief.mobile`)
  - Under **Capabilities**, enable **Sign In with Apple**
  - Save the changes
  - Note: You may also need to create a **Services ID** for web-based Apple Sign In if using Supabase's OAuth flow — check Supabase's Apple auth documentation for details

- [ ] **3. Create an APN (Apple Push Notification) key**
  - Go to **Keys** in the Apple Developer portal
  - Click the **+** button to create a new key
  - Name it something like `tief-push-notifications`
  - Check **Apple Push Notifications service (APNs)**
  - Click **Continue** then **Register**
  - **Download the .p8 file immediately** — Apple only lets you download it once
  - Note the **Key ID** displayed on the confirmation page
  - Also note your **Team ID** (visible in the top-right of the developer portal or under Membership)

- [ ] **4. Upload APN key to Expo**
  - Option A — via CLI:
    ```bash
    eas credentials
    ```
    Follow the interactive prompts to select iOS, then upload your APN key (.p8 file), Key ID, and Team ID.

  - Option B — via web:
    - Go to https://expo.dev → your project → **Credentials**
    - Upload the .p8 file with the Key ID and Team ID

- [ ] **5. Configure EAS project**
  - Run from the project root:
    ```bash
    eas build:configure
    ```
  - This links your local project to your EAS account and sets up the project on expo.dev
  - If prompted, select the correct Expo account and create a new project or link to an existing one

- [ ] **6. Fill in `eas.json` submit credentials**
  - Open `eas.json` in the project root
  - Under `submit.production.ios`, fill in:
    - `appleId`: Your Apple ID email used for App Store Connect
    - `ascAppId`: The App Store Connect app ID (numeric). Find this in App Store Connect → your app → General → App Information
    - `appleTeamId`: Your Apple Developer Team ID
  - Example:
    ```json
    "submit": {
      "production": {
        "ios": {
          "appleId": "your@email.com",
          "ascAppId": "1234567890",
          "appleTeamId": "ABCDE12345"
        }
      }
    }
    ```

- [ ] **7. Build the development client**
  - For physical device testing (required for microphone, push notifications, and ElevenLabs SDK):
    ```bash
    eas build --platform ios --profile development-device
    ```
  - For simulator testing (limited — no push notifications or microphone):
    ```bash
    eas build --platform ios --profile development
    ```
  - The build will take several minutes. EAS handles code signing automatically.

- [ ] **8. Install the development client on your device**
  - After the build completes, you have several options:
    - **QR Code:** Scan the QR code shown in the terminal or on the EAS build page
    - **TestFlight:** If you configured internal distribution, the build will appear in TestFlight
    - **Direct install:** Download the `.ipa` from the EAS build page and install via Xcode or Apple Configurator
  - Once installed, start the dev server locally:
    ```bash
    npx expo start --dev-client
    ```
  - Open the development client on your device — it will connect to your local dev server
