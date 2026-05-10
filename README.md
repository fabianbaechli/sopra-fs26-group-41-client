<div align="center">
  <img src="public/logo.png" alt="Movieblendr logo" width="140" />
  <h1>Movieblendr.</h1>
  <p><strong>Find the movie your whole group actually wants to watch.</strong></p>
  <p>
    <a href="https://github.com/fabianbaechli/sopra-fs26-group-41-client">Client</a> ·
    <a href="https://github.com/fabianbaechli/sopra-fs26-group-41-server">Server</a>
  </p>
  <p>
    <a href="https://github.com/fly-die"><img src="https://wsrv.nl/?url=https://github.com/fly-die.png&mask=circle&w=60&h=60" width="60" alt="fly-die" /></a>
    <a href="https://github.com/fabianbaechli"><img src="https://wsrv.nl/?url=https://github.com/fabianbaechli.png&mask=circle&w=60&h=60" width="60" alt="fabianbaechli" /></a>
    <a href="https://github.com/BB8006"><img src="https://wsrv.nl/?url=https://github.com/BB8006.png&mask=circle&w=60&h=60" width="60" alt="BB8006" /></a>
    <a href="https://github.com/EmritoHeltar"><img src="https://wsrv.nl/?url=https://github.com/EmritoHeltar.png&mask=circle&w=60&h=60" width="60" alt="EmritoHeltar" /></a>
  </p>
</div>

---

## What is this?

Picking a movie with a group is painful. Everyone has different taste, nobody commits, and you end up rewatching something you've all seen. Movieblendr fixes that.

Each member connects their [Letterboxd](https://letterboxd.com) history to build a personal taste profile. The app runs a recommendation algorithm across the whole group, surfaces movies everyone is likely to enjoy, and lets the group vote on a shortlist together in real time. No more endless discussions!

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org)|
| Languages | TypeScript, JS |
| UI | [Ant Design](https://ant.design) + CSS |
| Runtime | Node.js|
| Deployment | Vercel |

---

## High-level components

### 1. [User profile & Letterboxd import](app/users/me/page.tsx)
The entry point for personalisation. Users upload their Letterboxd data export (a ZIP file), which the server processes into a taste profile. Without this step the recommendation engine has nothing to work with, so everything else in the app depends on it.

### 2. [Group hub](app/groups/%5BgroupId%5D/page.tsx)
The main coordination screen for a group. Shows the group's aggregated recommendations (ranked by how well they match the whole group's taste), lets the owner start a poll, displays poll results, and links to the collaborative drawing canvas. This is where members spend most of their time.

### 3. [Poll flow](app/groups/%5BgroupId%5D/poll/page.tsx)
A swipe-style voting interface. Each member works through the recommended movies one by one (yes / no), reviews their answers, and submits. Once all members have voted the results appear on the group hub automatically.

### 4. [Real-time notification listener](app/components/PollNotificationListener.tsx)
A global WebSocket client that lives in the app layout and broadcasts in-app notifications to every member when a poll starts, a poll finishes, or a collaborative drawing session opens. Keeps the group in sync without anyone having to refresh the page.

---

## Launch & deployment

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- The backend server running locally (see [server repo](https://github.com/fabianbaechli/sopra-fs26-group-41-server))

### 1. Clone and install

```bash
git clone https://github.com/fabianbaechli/sopra-fs26-group-41-client.git
cd sopra-fs26-group-41-client
npm install
```

### 2. Set the backend URL

In development the app automatically points to `http://localhost:8080`. No extra configuration needed as long as the backend runs on that port.

For a custom backend URL (e.g. a staging server), create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_PROD_API_URL=https://your-backend-url.com
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The page hot-reloads on every file change.

### 4. Build for production

```bash
npm run build
npm run start
```

### 5. Lint & format

```bash
npm run lint
npm run fmt
```

### 6. Type checking

```bash
npx tsc --noEmit
```

This runs the TypeScript compiler without emitting files. Any type errors will be printed to the terminal.


---

## How it works, main user flows

# TODO: Include 2-3 Screenshots

### Onboarding

1. Register an account and log in.
2. On your profile page, click **Upload** and drop in your Letterboxd data export (`.zip`).
3. The app processes your rated movies and builds your taste profile.

### Finding a movie together

1. Create a group or accept an invite link.
2. Once enough members have uploaded their Letterboxd data, the group page shows recommendations.
3. The group owner clicks the **Start Poll** button and launches a poll.
4. Every member gets a notification and works through the poll independently, one movie at a time, yes or no.
5. When everyone has voted, results appear automatically on the group page.

### Collaborative drawing canvas

While waiting or just for fun, members can open a shared drawing canvas directly from the group page. Members will see their friends' drawings in real-time!

---

## Roadmap

These are the most impactful features a new contributor could add:

### 1. Persistent database
The backend currently uses an H2 in-memory database, which means all data is lost on restart and multi-instance deployments break. Migrating to PostgreSQL (e.g. Cloud SQL on GCP) would make the app prod-ready and allow horizontal scaling.

### 2. Weighted group matching
The current recommendation score averages overlap across all members equally. A smarter algorithm could weight scores by how strongly each member feels about a genre or director, so one person's deep aversion to horror overrides four casual viewers' mild preference for it.

### 3. Watch history and session tracking
After a movie is picked, there is no way to mark it as watched or rate it as a group. Adding a watch-history screen with a post-watch group rating would close the loop and feed back into future recommendations.

---

## Authors

| Name | GitHub handle |
|---|---|
| Flynn Diener | [@fly-die](https://github.com/fly-die) |
| Fabian Bächli | [@fabianbaechli](https://github.com/fabianbaechli) |
| Benjamin Boksberger | [@BB8006](https://github.com/BB8006) |
| Emre Halter | [@EmritoHeltar](https://github.com/EmritoHeltar) |

Built as part of the [Software Engineering Lab](https://hasel.dev) course at the University of Zurich, Spring 2026.

---

## License

This project is licensed under the **MIT License**, see [LICENSE](LICENSE) for details.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of this software. The only requirement is that the original copyright notice and this permission notice appear in all copies.
