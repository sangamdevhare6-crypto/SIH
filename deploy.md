# Deploy WORLD MONITOR

## Recommended: One Service

Deploy the frontend and backend together as one Node.js web service. The Express server already serves `frontend/`, APIs and the live SSE stream, so do not create a separate frontend service for the first deployment. You need one Node web service and one managed PostgreSQL database.

The steps below use Render. Railway instructions are at the end. A free web-service plan is suitable for a demo; it may sleep when idle, which delays first requests and interrupts long-lived SSE connections. Choose an always-on plan if the app needs continuous live updates.

## 1. Prepare GitHub

1. Make sure your project is pushed to a GitHub repository. In VS Code, open **Source Control** and check the changed files before committing.
2. Make sure `.env` is not in the files being uploaded. `.gitignore` excludes it; `.env.example` is only a template. If a real API key or password was ever pushed, revoke/rotate it at the provider now. Removing a file from the latest commit does not remove it from older Git history.
3. Commit and push the deployment changes to the branch you will deploy, usually `main`. Do not add the real `.env` file to Git.

## 2. Create PostgreSQL on Render

1. Sign in at [render.com](https://render.com/) and open the Render Dashboard.
2. Select **New +** then **PostgreSQL**.
3. Enter a database name such as `world-monitor-db`. Choose a region close to your users. Remember the region because the web service should use the same one.
4. Select a plan, then create the database. Wait until its status is **Available**.
5. Open the database details page and copy its **Internal Database URL**. Keep it private; you will paste it into the web service as `DATABASE_URL`. Use the internal URL because the app and database are both on Render.

## 3. Create the Web Service

1. In the Render Dashboard, select **New +** then **Web Service**.
2. Connect GitHub if asked, choose this repository, and click **Connect**.
3. Configure the service:

   | Render field | Set it to |
   | --- | --- |
   | Name | `world-monitor` (or another available name) |
   | Branch | The branch you pushed, usually `main` |
   | Root Directory | Leave blank; `package.json` is in the repository root |
   | Runtime | `Node` |
   | Build Command | `npm ci` |
   | Start Command | `npm start` |
   | Region | The same region as the PostgreSQL database |

4. Before creating the service, open **Advanced** / **Environment Variables** and add the variables in the next section. Render supplies `PORT` automatically; do not set a fixed port.
5. Choose an instance plan. A free instance is fine for trying the site, but it can sleep while idle. Use an always-on instance if SSE updates must remain continuously connected.
6. Click **Create Web Service**. Render builds the project and starts `npm start`.

## 4. Set Environment Variables

In Render, open your web service, select **Environment** in the left menu, and add these values. Click **Save Changes** after adding them; Render will redeploy.

| Key | Value to enter |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | The private **Internal Database URL** copied from the Render PostgreSQL page |
| `JWT_SECRET` | A newly generated random secret (instructions below) |
| `CORS_ORIGIN` | Your exact Render site URL, e.g. `https://world-monitor.onrender.com`; no trailing slash and no `*` |
| `SEED_DEMO_DATA` | `false` |

To generate a strong JWT secret, open a local terminal in the project and run:

```powershell
node -p "require('crypto').randomBytes(48).toString('hex')"
```

Copy the printed value into Render's `JWT_SECRET` field. Do not put it in `deploy.md`, chat, a screenshot, or Git. If Render assigned a URL different from the one you entered for `CORS_ORIGIN`, update `CORS_ORIGIN` to match the service's actual URL exactly and save again.

`WEATHER_API_KEY`, `MAP_API_KEY`, and `RADAR_API_KEY` are optional integration settings listed in `.env.example`. Add valid keys from the relevant providers only if you have configured those integrations. Empty or demo credentials can result in fallback/simulated values; they do not turn the sample sensor and alert records into real data.

## 5. Wait for the First Deployment

1. Open the service's **Events** or **Logs** tab and wait for the deployment to finish successfully.
2. On first connection to an empty PostgreSQL database, this app creates its schema automatically. Production does not load the demo seed data.
3. Check the logs for a successful PostgreSQL connection and the service listening message. If startup fails, check that `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, and `NODE_ENV` are present and correctly spelled in **Environment**.
4. Open `https://YOUR-RENDER-SERVICE.onrender.com/api/health` in a browser. Replace the example host with the actual service URL. The response should contain `"status":"ONLINE"`.
5. Open the site root, `https://YOUR-RENDER-SERVICE.onrender.com/`, and check that the login page loads over HTTPS.

## 6. Create the First Authority Account

Authority self-registration is intentionally disabled in production. Create the first officer account from the Render service shell:

1. Open the web service in Render and select **Shell**.
2. From the repository root, run:

   ```bash
   npm run provision:authority
   ```

3. Enter the officer's name, email, department, designation, optional official ID, and a unique password of at least 12 characters. The password is masked while typing.
4. Wait for `Authority account created`. The command writes a bcrypt password hash to PostgreSQL; it does not print the password.
5. Open the deployed site and sign in with that account. Citizen accounts can still be registered through the normal citizen signup page.

If your Render plan does not provide Shell, use a provider/plan that allows a one-off interactive command. The provisioning command needs the same production `DATABASE_URL` and production environment settings as the web service. Do not enable public authority signup as a workaround.

## 7. Smoke-Test the Deployment

1. Visit `/api/health` and confirm it returns `ONLINE`.
2. Register a test citizen, sign in, and open the dashboard.
3. Sign in with the authority account created above and confirm its profile loads.
4. Check that a citizen cannot access an authority-only action. Do not create a real emergency alert just to test this on a public deployment; test alert broadcasting in a private staging deployment.
5. Submit a clearly labelled test report and confirm it appears after a redeploy. This checks PostgreSQL persistence.
6. In browser developer tools, check that `/api/realtime/stream` connects. On a sleeping/free instance, it may disconnect when the host pauses the service.

## Optional: Railway

1. Sign in at [railway.app](https://railway.app/), create a project, and choose **Deploy from GitHub repo**. Select this repository.
2. Add a PostgreSQL service to the same project.
3. In the app service's **Variables**, add `NODE_ENV=production`, `JWT_SECRET`, `CORS_ORIGIN`, and `SEED_DEMO_DATA=false`. Set `DATABASE_URL` to Railway's PostgreSQL connection-reference value shown for the database service; use Railway's **Add Reference** picker rather than copying a password into source files.
4. Set the app service's start command to `npm start` if Railway does not detect the `start` script automatically. Deploy and wait for the build and health check.
5. Use the app service's shell to run `npm run provision:authority`, then follow the smoke-test steps above.

## Do Not Do These Things

- Never run `npm run seed` against production. The seed SQL truncates application tables and inserts demo records.
- Never commit `.env`. If its values were pushed before, rotate those credentials even after removing the file.
- Do not treat the sample alerts, river levels, sensor readings, safe routes, or fallback weather as live emergency information. Connect and validate trusted operational data sources before any public-safety use.
- Do not split the frontend and backend for the initial deployment. If you later host the frontend separately, update both the API base URL and SSE URL to the backend domain, then set backend `CORS_ORIGIN` to the exact frontend origin.