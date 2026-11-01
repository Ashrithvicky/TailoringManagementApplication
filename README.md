# TA – Tailoring Manager

Offline-first mobile app (Android APK / iOS) for a tailoring shop. All data stays on the device in an encrypted database.

## Features

- **Dashboard** – counted per client: total clients, stitched & given (completed), to complete, plus dresses and lining pending. Tiles are tappable and open the filtered Users list or Inventory.
- **New** – client (name, phone required; area optional) plus first dress: Saree-Blouse (length, breadth, hand length, hand breadth, saree fall needed/given dropdowns) or Chudidhar (Top with hand length/breadth, Pant length/breadth), count, lining yes/no (with how many), "Notes (Design)". The date defaults to the phone's current date and can be changed.
- **Users** – clients A–Z, search by name or mobile number, All / To complete / Completed filters, a Completed badge when every dress is done, added date. Each client row and the client page have a three-dot menu with *Delete client*. Each dress has a three-dot menu with *Delete* and two side-by-side buttons: *Stitched* (counts as completed) and *Given* (handed over to the client; implies stitched).
- **Saree fall** – "Saree fall given?" only appears when "Saree fall needed?" is Yes.
- **Payments** – pick a client; counts (saree fall, blouse, blouse lining, chudidhar, chudidhar lining) are pre-filled from their dresses and editable; each line = count × the price set in Profile; an *Extra items* amount (stones etc.) is added; the grand total updates live. *Save* stores the bill, *Send* opens the phone share sheet (WhatsApp, SMS) with the bill text.
- **Payment history** – every saved bill, newest first; the tile is enough in the overall list. Open a bill to *Send* it (share sheet) and write a *Note* (remarks). A client's page shows only their own bills. Bill text: `Date`, `Name`, one `label: n x price = amount` block per item, `Extra items`, `Total`, separated by blank lines.
- **Not-registered clients** – use the **+** button in Payments to bill someone who is not a client (name and mobile). Their bills are kept in the history with a *Not registered* tag at the top right.
- **Profile → Prices** – the owner sets the five prices; *Save prices* is disabled until a value changes.
- **Inventory** – lining still to buy for pending dresses, per client; tap "Received 1" as lining arrives. *Export inventory data* lets you select tiles (or select all), then becomes *Send inventory data* and shares `Name: … / No.Of.Linings: n` blocks separated by dashes. Sent tiles glow and move below the pending ones, and the export is logged in that client's dress card as lining history.
- **Dashboard** – the app logo sits in a tile at the bottom.
- **Tab bar** – opaque, in-flow bar so content never shows behind it (works with 3-button Android navigation).
- **Profile** – shop details and language (English / தமிழ்).

## Tech stack

| Concern | Choice |
| --- | --- |
| App | Expo SDK 58, React Native, TypeScript (strict), Expo Router |
| Local "backend" | `src/data` repositories over `expo-sqlite` |
| Encryption | SQLCipher (`useSQLCipher`); random 256-bit key kept in `expo-secure-store` (Android Keystore / iOS Keychain) |
| i18n | `i18next` + `react-i18next` (`src/i18n/en.ts`, `ta.ts`), device language by default, switchable in Profile |
| UI | Cosmic gradient with animated twinkling stars (`StarField`), glass cards via `expo-blur`, `expo-linear-gradient`; theme in `src/theme.ts` |
| Tests | Jest (`jest-expo`) |

Security notes: parameterised SQL only, input validated in `src/domain`, Android cloud backup disabled (`allowBackup: false`), release builds refuse to run without SQLCipher.

## Structure

```
src/app        Expo Router screens ((tabs)/ and client/[id]/)
src/components Reusable UI (GlassCard, Field, RadioGroup, OrderFormFields, ...)
src/data       SQLite open/encrypt/migrate + repositories
src/domain     Types and pure validation (no I/O)
src/i18n       Translations
__tests__      Unit tests
```

Add schema changes by appending to `MIGRATIONS` in `src/data/schema.ts`. Add a language by adding a file typed as `Translation` and registering it in `src/i18n/index.ts`.

## Repository contents and fresh workspace setup

The repository includes the application source, tests, configuration, `package-lock.json`, and required app assets. The lockfile lets a new workspace install the same dependency versions. App images and icons in `assets/` are part of the project and should be committed.

`.gitignore` excludes local or generated files that should not be uploaded:

- Installed dependencies and Expo caches/build output: `node_modules/`, `.expo/`, `dist/`, `web-build/`, and Metro health-check files.
- Generated native projects: `android/`, `ios/`, and `.kotlin/`. Expo can regenerate these when needed.
- Build and test output: `coverage/`, `.apk`/`.aab` files, and TypeScript build info.
- Signing credentials and service configuration: keystores, signing keys/certificates, provisioning profiles, `google-services.json`, `GoogleService-Info.plist`, and `credentials.json`.
- Local environment files (`.env` and `.env.*`), local SQLite database files, editor/tool settings (`.vscode/`, `.idea/`, `.claude/`), OS metadata, and package-manager debug logs.

Ignoring a path does not remove it from Git if it was already committed. To stop tracking a previously committed file, remove it from the index separately, for example with `git rm --cached <path>`.

After cloning or importing the repository, install the JavaScript packages from the lockfile and run checks:

```bash
npm ci
npm test
npm run typecheck
npm run lint
```

`npm ci` downloads Expo SDK 58, React Native, Expo Router, SQLCipher-enabled `expo-sqlite`, and the other dependencies declared in `package-lock.json`. This app does not use or require a separate AI/ML model download. For a local Android build, install Android Studio and its Android SDK, then run `npx expo run:android`; the ignored native project is generated as part of the Expo workflow. Alternatively, an EAS cloud build needs an EAS account but not a local Android SDK.

## Run

SQLCipher is not in Expo Go, so use a development build or APK.

```bash
npm install
npm test                 # unit tests
npm run typecheck
npx expo run:android     # local dev build (needs Android Studio / SDK)
```

## Build the APK (cloud, no Android Studio needed)

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

Download the `.apk` from the build link and install it on the phone.

## Environment variables

None. The database key is generated on first launch and never leaves the device. The encrypted file is `TA/ta.db` inside the app's private storage (not visible to other apps or the Files app). Uninstalling the app (or clearing its data) permanently deletes the data.
