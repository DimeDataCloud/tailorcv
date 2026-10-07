# TailorCV

AI-powered resume tailoring app. Paste a job posting, and TailorCV rewrites your resume to match it — on-device-friendly, with several design presets and PDF export.

Built with Expo / React Native. Groq (llama-3.3-70b) does the tailoring **server-side** via a Supabase Edge Function, so no model API key ships in the app bundle.

## Stack

- **App:** Expo SDK 56, React Native, TypeScript
- **Backend:** Supabase (auth, Postgres, storage, Edge Functions)
- **AI:** Groq `llama-3.3-70b` (called from a Supabase Edge Function)
- **Builds:** EAS Build (preview profile → APK)

## Setup

1. `npm install`
2. Copy `eas.json`'s `EXPO_PUBLIC_*` placeholders into your environment:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

   These are the Supabase **anon** key + URL and are safe to ship in a client bundle (RLS enforces access). The Groq key lives only in the Edge Function's secrets — never in the app.
3. `npx expo start` for local dev, or `eas build --profile preview` for an APK.

## Data & privacy

TailorCV stores user accounts and uploaded/tailored resumes (personal data) in Supabase. A privacy policy is required before any public App Store / Play Store release — see the launch checklist.

## Status

Independent product. The Supabase backend project may be paused between active development pushes; resume it before running the app.
