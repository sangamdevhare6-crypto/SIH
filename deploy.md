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

## 3. API Keys Aur JWT Secret Taiyar Karo

1. [OpenWeather](https://openweathermap.org/api) par account banao aur API key lo. Ye `WEATHER_API_KEY` hai; current weather aur forecast API access enabled hona chahiye.
2. [Tomorrow.io](https://www.tomorrow.io/weather-api/) par account banao aur API key lo. Ye `RADAR_API_KEY` hai.
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
   | `DATABASE_URL` | Step 2 ka Internal Database URL |
   | `JWT_SECRET` | Step 3 mein generate ki hui value |
   | `CORS_ORIGIN` | `https://world-monitor.onrender.com` |
   | `SEED_DEMO_DATA` | `false` |
   | `WEATHER_API_KEY` | Step 3 ki OpenWeather key |
   | `RADAR_API_KEY` | Step 3 ki Tomorrow.io key |

5. **Create Web Service** dabao. Render jo site URL de, use copy karo. Agar URL `https://world-monitor.onrender.com` se alag hai, service ke **Environment** page par `CORS_ORIGIN` ko exact URL se update karke **Save Changes** dabao.

## 5. Deployment Check Karo

1. Service ke **Events** tab mein deploy complete hone ka wait karo.
2. **Logs** tab mein PostgreSQL connection aur server start success check karo.
3. Browser mein `https://YOUR-SERVICE.onrender.com/api/health` kholo. `YOUR-SERVICE` ki jagah apna Render service name dalo. Response mein `"status":"ONLINE"` hona chahiye.
4. `https://YOUR-SERVICE.onrender.com/` kholo. Login page dikhna chahiye.

## 6. Authority Account Banao

1. Render service page mein **Shell** kholo.
2. Ye command chalao:

   ```bash
   npm run provision:authority
   ```

3. Name, email, department, designation, official ID aur kam-se-kam 12 characters ka password enter karo.
4. `Authority account created` dikhne ke baad deployed site par us account se login karo.

## 7. Final Test Karo

1. Citizen account register karke login karo.
2. Dashboard kholo aur data load hona check karo.
3. Authority account se login karo.
4. Test report submit karke refresh karo; report dikhni chahiye.
5. Browser Developer Tools ke **Network** tab mein `/api/realtime/stream` request open karke SSE connection check karo.

Production database par `npm run seed` mat chalao; ye existing records delete karta hai aur demo data insert karta hai. Sample alert, sensor, route aur weather data ko real emergency information mat samjho.