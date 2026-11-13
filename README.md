# CampusFind

A lost-and-found app for college campuses. Students report what they lost or found with a photo, the app tags the photo and suggests likely matches, and a claim ends in an in-person handoff confirmed with a one-time code.

**Live:** https://campusfindapp.vercel.app · **Demo video (earlier version):** https://www.youtube.com/watch?v=rP8kG_iP4Lg

## Why

Lost items on campus usually end up in scattered group chats and notice boards. Anyone can say "that's mine", and meeting a stranger to hand something over is awkward. CampusFind puts the whole loop in one place: report, match, claim, meet, confirm.

## How it works

1. **Report.** Upload a photo, where you lost or found it, and when. GPT-4o-mini reads the photo and adds tags (category, colour, brand, distinctive marks).
2. **Match.** Every report is embedded with OpenAI (`text-embedding-3-small`, 512 dimensions) and stored in Postgres with pgvector. Each item page lists the nearest open reports of the opposite kind by cosine similarity, and when a new report closely resembles yours you get a notification. Reports without an embedding fall back to tag matching.
3. **Claim.** The claimant explains why it's theirs (or where they found it). The reporter accepts and sets a meeting place and time, or declines.
4. **Meet.** The claimant gets a 6-digit handoff code. The reporter types it in at the meeting to confirm the return.
5. **Recover.** The item is marked returned, leaves the feed, and the finder earns trust points on the leaderboard.

Contact details stay hidden until a claim is accepted, and only one handoff per item can be in progress at a time.

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
  middleware.js       Auth, error handling, rate limits, input helpers
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

## API

| Method and path | Who | Purpose |
| --- | --- | --- |
| `POST /api/auth/register`, `/login`, `/google` | anyone, rate limited | Create an account or sign in |
| `GET /api/auth/me`, `PUT /api/auth/profile` | signed in | Current user and profile edits |
| `GET /api/auth/leaderboard` | anyone | Top finders |
| `GET /api/items` | anyone | Feed: `type`, `q`, `limit`, `offset` |
| `GET /api/items/stats` | anyone | Counts for the insights page |
| `GET /api/items/:id`, `/match/:id` | anyone | Item detail and possible matches |
| `POST /api/items` | signed in, rate limited | Report an item (multipart photo) |
| `GET /api/items/my` | signed in | Items I reported or claimed |
| `POST /api/claims`, `GET /api/claims/item/:id` | signed in | Submit and list claims |
| `POST /api/claims/:id/respond` | reporter | Accept or decline a claim |
| `POST /api/claims/verify` | reporter, rate limited | Confirm a handoff with the 6-digit code |
| `GET /api/claims/notifications`, `POST .../read` | signed in | In-app notifications |

## Security

- Passwords are hashed with bcrypt, and a wrong password looks exactly like an unknown email.
- Tokens are HS256 JWTs that expire after 24 hours.
- Uploads require sign-in before any image processing or AI call happens.
- Reporter contact details are only sent to the reporter and to a claimant whose claim was accepted.
- The handoff code is only shown to the claimant, only matches items the caller reported, expires 7 days after the meeting, and guesses are rate limited.
- Rate limits are kept in memory per server instance, so on serverless hosting they slow attackers down rather than stop them.

---

Built by team **Deploy for Good**.
