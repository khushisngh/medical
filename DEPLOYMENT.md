# Deployment Guide (Vercel + Render)

## 1) Deploy backend on Render

1. Open [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repo and select this repository.
4. Render will detect `healthcare-plus/render.yaml` and create the backend service.
5. Set secret env var:
   - `OPENROUTER_API_KEY` (required)
6. Deploy and copy the backend URL, for example:
   - `https://menrag-backend.onrender.com`

## 2) Deploy frontend on Vercel

1. Open [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** -> **Project** and import this repository.
3. Set **Root Directory** to:
   - `healthcare-plus/frontend`
4. Add environment variable:
   - `REACT_APP_API_BASE_URL=https://your-render-backend-url.onrender.com`
5. Deploy.

## 3) Verify

1. Open the Vercel URL.
2. Test these flows:
   - Health plan generation
   - Mental health chat
   - Appointment API calls
3. If any request fails, check browser network logs and ensure `REACT_APP_API_BASE_URL` points to your live Render backend.
