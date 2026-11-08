KIDUS AI starter (website + Android)

IMPORTANT:
- This starter uses Expo, so the same React Native app can run on web and Android.
- Supabase stores accounts and chat history.
- The OpenAI API key belongs in Supabase Edge Function secrets, NEVER in App.js or src/supabase.js.
- Do not share passwords, API keys, or Supabase secret/service_role keys in chat.

Files:
- App.js: app interface
- src/supabase.js: Supabase connection settings
- supabase/schema.sql: database tables and security policies
- supabase/functions/chat/index.ts: secure AI server function

Setup overview:
1. Install dependencies / open project in Expo.
2. Replace the two placeholders in src/supabase.js with the Supabase Project URL and Publishable key.
3. Run supabase/schema.sql in Supabase SQL Editor.
4. Deploy the Edge Function named "chat".
5. Add OPENAI_API_KEY as a secret for that Edge Function (never in frontend).
6. Run on web with `npx expo start --web`; Android with Expo Go or an Android build.

Email confirmation:
Configure Supabase Auth URL settings before testing sign-up. The confirmation redirect must point to a real app/site URL, not localhost unless you are running a local web server. For production, set your published website URL and configure the Android deep link scheme `kidusai://`.
