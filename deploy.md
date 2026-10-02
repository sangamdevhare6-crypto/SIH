# Render Deployment

Frontend aur backend ek hi Render Web Service par deploy honge. Alag frontend service mat banao.

## 1. GitHub Par Code Push Karo

1. VS Code mein **Source Control** kholo.
2. Confirm karo ki `.env` commit mein nahi hai.
3. `npm test` chalao; tests pass hone par changes commit karke GitHub par push karo.
4. Agar `.env` ki asli keys pehle GitHub par push hui thi, unhe provider se rotate karo.

## 2. PostgreSQL Banao

1. [Render Dashboard](https://dashboard.render.com/) kholo.
2. **New +** > **PostgreSQL** chuno.
3. Name `world-monitor-db` likho.
4. Region chuno; yehi region web service ke liye use karna hai.
5. **Create Database** dabao aur status **Available** hone tak wait karo.
6. Database page se **Internal Database URL** copy karo. Ye `DATABASE_URL` hoga.

## 3. Weather API Key Aur JWT Secret Taiyar Karo

1. [OpenWeather](https://openweathermap.org/api) par account banao aur API key lo. Ye `WEATHER_API_KEY` hai; current weather aur forecast API access enabled hona chahiye.
2. Radar RainViewer se aata hai; iske liye `RADAR_API_KEY` ki zaroorat nahi hai.
3. PowerShell mein ye command chalao aur output copy karo:

   ```powershell
   node -p "require('crypto').randomBytes(48).toString('hex')"
   ```

   Output `JWT_SECRET` hoga. Is value ko GitHub ya source files mein mat rakho.

## 4. Render Web Service Banao

1. Render mein **New +** > **Web Service** chuno.
2. GitHub connect karo, repository select karke **Connect** dabao.
3. Ye settings bharo:

   | Field | Value |
   | --- | --- |
   | Name | `world-monitor` |
   | Branch | Push ki hui branch, aam taur par `main` |
   | Root Directory | Blank chhodo |
   | Runtime | `Node` |
   | Build Command | `npm ci` |
   | Start Command | `npm start` |
   | Region | PostgreSQL wale region jaisa |

4. **Advanced** kholo aur **Add Environment Variable** par click karke ye values add karo:

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `ADMIN_EMAIL` | Admin account ka exact email; neeche isi email se account banao |
   | `DATABASE_URL` | Step 2 ka Internal Database URL |
   | `JWT_SECRET` | Step 3 mein generate ki hui value |
   | `CORS_ORIGIN` | `https://world-monitor.onrender.com` |
   | `SEED_DEMO_DATA` | `false` |
   | `WEATHER_API_KEY` | Step 3 ki OpenWeather key |

5. **Create Web Service** dabao. Render jo site URL de, use copy karo. Agar URL `https://world-monitor.onrender.com` se alag hai, service ke **Environment** page par `CORS_ORIGIN` ko exact URL se update karke **Save Changes** dabao.

## 5. Deployment Check Karo

1. Service ke **Events** tab mein deploy complete hone ka wait karo.
2. **Logs** tab mein PostgreSQL connection aur server start success check karo.
3. Browser mein `https://YOUR-SERVICE.onrender.com/api/health` kholo. `YOUR-SERVICE` ki jagah apna Render service name dalo. Response mein `"status":"ONLINE"` hona chahiye.
4. `https://YOUR-SERVICE.onrender.com/` kholo. Login page dikhna chahiye.
5. City search endpoint check karne ke liye `https://YOUR-SERVICE.onrender.com/api/weather/locations?q=Mumbai` kholo. Response mein `"success":true` aur city results hone chahiye.

## City Search Error

1. Web Service > **Environment** mein `WEATHER_API_KEY` check karo. Ye active OpenWeather key honi chahiye.
2. Agar key abhi add ya update ki hai, **Save Changes** karke redeploy complete hone do.
3. Agar endpoint `Cannot GET` ya `404` de, latest backend commit push karke Render par deploy karo.
4. Agar response `401` ya `403` de, OpenWeather key aur Geocoding API access check karo. `429` aaye to quota reset hone ka wait karo.

## 6. Authority Account Banao

1. Render service page mein **Shell** kholo.
2. Ye command chalao:

   ```bash
   npm run provision:authority
   ```

3. Name, email, department, designation, official ID aur kam-se-kam 12 characters ka password enter karo.
4. Email Render ke `ADMIN_EMAIL` se bilkul match hona chahiye. Sirf ye account Admin Dashboard ke registered users dekh sakta hai.
5. `Authority account created` dikhne ke baad deployed site par us account se login karo.

## 7. Final Test Karo

1. Citizen account register karke login karo.
2. Dashboard kholo aur data load hona check karo.
3. Authority account se login karo.
4. Test report submit karke refresh karo; report dikhni chahiye.
5. Browser Developer Tools ke **Network** tab mein `/api/realtime/stream` request open karke SSE connection check karo.

## Render Mein `Cannot find module .../node_modules/backend/server.js` Error

1. Render Dashboard mein apni Web Service kholo.
2. **Settings** > **Build & Deploy** kholo.
3. **Root Directory** ko blank karo. Is field mein `node_modules` ya `backend` nahi hona chahiye; repository root mein `package.json` hai.
4. **Build Command** `npm ci` aur **Start Command** `npm start` set karo.
5. **Save Changes** dabao.
6. **Manual Deploy** > **Deploy latest commit** chuno.
7. Logs mein `npm start` aur successful server start check karo.

## PostgreSQL `getaddrinfo ENOTFOUND` Error

1. Render Dashboard mein PostgreSQL database kholo. Status **Available** hona chahiye.
2. Database ke **Connect** menu se poora **Internal Database URL** copy karo. URL `postgresql://` se shuru hota hai; sirf hostname copy mat karo.
3. Confirm karo ki web service aur PostgreSQL database same Render account aur same region mein hain.
4. Web Service > **Environment** kholo. `DATABASE_URL` ki poori value ko copied URL se replace karo. Value ke aage/peeche quotes ya spaces mat rakho.
5. **Save Changes** dabao aur redeploy complete hone ka wait karo.
6. Logs mein `PostgreSQL connected successfully` check karo.
7. Agar service aur database same region mein nahi rakh sakte, database ke **Connect** menu se **External Database URL** use karo.

Production database par `npm run seed` mat chalao; ye existing records delete karta hai aur demo data insert karta hai. Sample alert, sensor, route aur weather data ko real emergency information mat samjho.