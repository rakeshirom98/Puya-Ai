# PUYA AI

PUYA AI is a responsive AI workspace built with Next.js, TypeScript, React,
and Tailwind CSS. Groq and Google Gemini requests are made through a server
route, so provider API keys are never sent to the browser. Conversations and
preferences are stored in the current browser and are not synced to a cloud account.

## Run locally

1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. Run `npx -y clerk@latest init` once to configure Clerk and create local
   development keys in `.env.local`. Do not replace that file with
   `.env.example`; add the AI provider keys to the existing file instead.
4. Add the provider key you choose in Settings: `GROQ_API_KEY` or
   `GEMINI_API_KEY`. For web search, add a `BRAVE_SEARCH_API_KEY` from Brave
   Search API as well.
5. Run `npm run dev` and open <http://localhost:3000>. Use `localhost`, not
   `127.0.0.1`; Clerk's local development session is tied to the configured
   origin.

## Authentication

Clerk provides sign-in and sign-up. The chat, Settings page, and chat API
require an authenticated session. The account menu is in the chat sidebar.
Local development credentials created by Clerk are temporary; claim the app
with `npx -y clerk@latest auth login` before configuring sign-in methods or
preparing production credentials. Conversations and preferences remain in the
current browser and are not synced to Clerk or across devices.

The public privacy policy is available at `/privacy-policy` and is linked from
Settings → Data controls and the authentication forms.

The Settings menu calls the providers “PUYA AI” and “Kanglei AI.”
“PUYA Lite” selects Qwen 3.8 27B or Gemini 3.8 Flash; “PUYA Ultra” selects
GPT-OSS 120B or Gemini 4 Argon. Keep `.env.local` private and never put
provider keys in `NEXT_PUBLIC_` variables.

## Settings

Open `/settings` from the chat sidebar. Preferences, appearance, notification
choices, profile labels, and personalization are saved in the current browser.
Archived chats can be restored or deleted there; exports download browser-local
data. Clerk manages sign-in credentials and account access. Billing, trusted
contacts, parental controls, and third-party integrations are not enabled
because this starter has no corresponding backend or payment service.

## Current functionality

- Streaming Groq and Google Gemini chat, with Chat, Reasoning, and Web Search modes. Manipuri mode is marked as coming soon.
- Local chat history and conversation deletion.
- Search/filter local conversation titles.
- Markdown rendering and code block copy buttons.
- Persisted provider, model, response language, style, and saved-info preferences.
- Browser activity controls to pause saving new chats, delete chat activity,
  or clear saved response information.
- Dedicated black settings interface with searchable categories, local appearance
  and notification preferences, voice preview, data export, and archived chat
  management.
- Light/dark theme and responsive sidebar.
- Groq vision model for PNG, JPEG, WebP, and GIF images (5 MB maximum).
- Optional Brave web search with source links in AI responses.

Cross-device storage, account deletion, billing, document parsing, and
administrator actions are not enabled in this local starter.
Web search requires its own Brave API key. Image content is sent to the
selected provider (Groq's vision model or the selected Gemini model). Provider
keys are server-side only.
