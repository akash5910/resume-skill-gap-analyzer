# Resume Skill Gap Analyzer

This project joins Member 1's registration, login, profile and resume module with the Member 2 analysis API and the Member 3 dashboard. All parts use the MongoDB URI in the project root `.env` file.

## Start the app

1. Make sure `.env` contains `MONGODB_URI` (or `MONGO_URI`) and an optional `SESSION_SECRET`. See `.env.example` for the port settings.
2. Run `npm install` from the project root.
3. Run `npm install` once from `member1/ResumeSkillGapAnalyzer` to install Member 1's dependencies.
4. Run `npm start` from the project root. It starts the React page on port 5173, Member 3 API on port 5000, Member 2 API on port 5001, and Member 1 account/resume API on port 3000.
5. Register or log in from the React page. The profile ID is used automatically for skills, progress and bookmarks.
6. From the project root, run `node member2/member2/seed/seedJobRoles.js` to add any missing example roles. Existing roles are left unchanged.

## Pages

- **Dashboard:** profile editing, resume upload and viewing, saved personal skills, learning progress, and bookmarked roles.
- **Job roles:** Member 2's server provides `/api/jobroles`; the page searches by name, filters by domain, and bookmarks roles.
- **Skill analysis:** Member 2's `/api/analyze` routes compare profile skills with roles and show match scores, skill gaps, a roadmap, learning time, and free resources.
- **Resources:** search by title and filter by skill.
- **Admin:** the Admin tab appears after a successful separate admin login. It manages job roles and learning resources.

The demo admin login is `admin` / `Admin@12345`. The credentials are checked by the server and are not included in the React client. Admin sessions expire after 8 hours or when the server restarts.

Member 1 uses a MongoDB session cookie shared with the React page through credentialed local requests. User profile skills are stored in the `Users` collection; resume metadata is stored in `Resumes`, with PDF files in `member1/ResumeSkillGapAnalyzer/uploads/resumes`.

## API

- `GET /api/skills?q=sql`
- `GET /api/roles?q=developer&domain=Technology&skill=SQL`
- Member 2 routes: `GET /api/jobroles`, `GET /api/jobroles/by-skill/:skill`, plus admin-key protected create, edit, and delete routes.
- Member 2 analysis: `POST /api/analyze` and `POST /api/analyze/all` with `{ "userSkills": ["SQL", "JavaScript"] }`.
- `GET /api/resources?q=basics&skill=SQL&difficulty=Beginner`
- `GET /api/dashboard/:userId`
- `GET /api/progress/:userId`, `POST /api/progress`, `DELETE /api/progress/:userId/:skill`
- `GET /api/bookmarks/:userId`, `POST /api/bookmarks` (toggles a saved role)
- Admin CRUD: `POST`, `PUT`, and `DELETE /api/admin/skills`, `/api/admin/roles`, `/api/admin/resources`
- Member 1 account API on port 3000: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/profile`, and `/api/profile/skills`
- Member 1 resume API: `GET /resumes/list`, `POST /resumes/upload`, `GET /resumes/:id/view`, and `POST /resumes/:id/delete`

Port 3000 is kept separate from the shared `PORT=5000` setting so Member 1 does not conflict with Member 3. The React analysis field accepts comma-separated skills and saves them to the logged-in user's profile.
