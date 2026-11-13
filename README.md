# CampusFind

A lost-and-found app for college campuses. Students report what they lost or found with a photo, the app tags the photo and suggests likely matches, and a claim ends in an in-person handoff confirmed with a one-time code.

## Why

Lost items on campus usually end up in scattered group chats and notice boards. Anyone can say "that's mine", and meeting a stranger to hand something over is awkward. CampusFind puts the whole loop in one place: report, match, claim, meet, confirm.

## Features

- **AI-Powered Photo Tagging**: Upload a photo of a lost or found item. GPT-4o-mini extracts visual details, dominant color, brand, and distinctive marks automatically.
- **Semantic Vector Matching**: Reports are embedded with OpenAI (`text-embedding-3-small`, 512 dimensions) and matched using cosine similarity in Postgres with pgvector. If vector search is unavailable, it gracefully falls back to tag-based matching.
- **Match Alerts**: Automatically notifies reporters whenever a new opposite report (lost vs. found) shares strong semantic similarity with their item.
- **Secure 6-Digit Handoff Verification**: Prevents wrongful claims by issuing a private 6-digit handoff code to the claimant upon claim acceptance. The reporter enters the code during the in-person meeting to verify and close the report.
- **Trust & Leaderboard System**: Returning an item awards trust points to the finder, featured on the campus leaderboard.
- **Privacy-Protected Contact Sharing**: Personal phone and contact details remain strictly hidden until the reporter explicitly accepts a claim and sets a meeting.
- **Campus Insights & Analytics**: Interactive charts showing recovery rates, common item categories, and high-frequency lost-and-found locations across campus.
- **In-App Notifications**: Real-time updates for claim submissions, accepted handoffs, verified returns, and match suggestions.
- **Flexible Authentication**: Google Sign-In (Firebase Admin) and email/password authentication secured with bcrypt and 24-hour JWT sessions.
- **Responsive & Accessible Design**: Built with Tailwind CSS featuring dark mode, mobile navigation bar, and accessible form controls.

## How it works

1. **Report.** Upload a photo, where you lost or found it, and when. GPT-4o-mini reads the photo and adds tags (category, colour, brand, distinctive marks).
2. **Match.** Every report is embedded with OpenAI and stored in Postgres with pgvector. Each item page lists the nearest open reports of the opposite kind by cosine similarity.
3. **Claim.** The claimant explains why it's theirs (or where they found it). The reporter accepts and sets a meeting place and time, or declines.
4. **Meet.** The claimant gets a 6-digit handoff code. The reporter types it in at the meeting to confirm the return.
5. **Recover.** The item is marked returned, leaves the feed, and the finder earns trust points on the leaderboard.

## Tech stack

| Area | Tools |
| --- | --- |
| Frontend | React 19, Vite, React Router, Tailwind CSS |
| Backend | Node.js, Express, Sequelize |
| Database | Postgres (Neon) with pgvector |
| Auth | JWT, bcrypt, Firebase (Google sign-in) |
| Images and AI | Cloudinary, sharp, OpenAI |
| Hosting | Vercel |

## Project structure

```text
public/              Static assets (logo, Google icon)
src/
  App.jsx            Routes, route guard, lazy-loaded pages
  pages/             Home, ItemDetail, Upload, MyActivity, Profile, Stats, Scanner, Auth
  components/        Layout, cards, modals, and shared UI pieces
server/
  index.js           Express app and entry point
  db.js              Postgres connection, models and associations
  middleware.js      Auth, error handling, rate limits, input helpers
  firebase.js        Verifies Google sign-in tokens
  cli.js             npm run db:migrate / db:embed
  routes/            auth.js, items.js, claims.js
  services/          ai.js (tagging, embeddings), images.js (resize, upload), matching.js
vercel.json          Serves the API and the built frontend from one project
```

## Run locally

You need Node 20+ and a Postgres database (a free Neon project works).

```bash
cp .env.example .env   # fill in the values

# Server
cd server && npm install && cd ..
npm run db:migrate     # create tables, indexes, pgvector column (safe to re-run)
npm run db:embed       # embed reports that don't have a vector yet
npm run dev:server     # http://localhost:5001

# Client (in a second terminal)
npm install
npm run dev            # http://localhost:5173, proxies /api to the server
```

`SECRET_KEY` is required in production; the server refuses to start without it. See [`.env.example`](.env.example) for every setting.

## Security

- Passwords are hashed with bcrypt, and a wrong password looks exactly like an unknown email.
- Tokens are HS256 JWTs that expire after 24 hours.
- Uploads require sign-in before any image processing or AI call happens.
- Reporter contact details are only sent to the reporter and to a claimant whose claim was accepted.
- The handoff code is only shown to the claimant, only matches items the caller reported, expires 7 days after the meeting, and guesses are rate limited.
- Rate limits are kept in memory per server instance, so on serverless hosting they slow attackers down rather than stop them.

---

Built by team **Deploy for Good**.
