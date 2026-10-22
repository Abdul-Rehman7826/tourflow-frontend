# TourFlow - Frontend Application

Modern Travel ERP & Agency Operations frontend built with Next.js (App Router), React 19, Tailwind CSS v4, and TypeScript.

## Architecture

This frontend is decoupled from the backend and connects via REST API:
- **Backend API URL**: `https://api.worldclassholidays.org/api/v1`
- **Hosted On**: Cloudflare Pages / Edge Network
- **Production Domain**: `https://crm.worldclassholidays.org`

## Environment Setup

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=https://api.worldclassholidays.org/api/v1
```

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Production Build

```bash
npm run build
npm run start
```

## Cloudflare Pages Deployment

1. Connect this repository to **Cloudflare Pages**.
2. Set Build Command: `npm run build`
3. Set Output Directory: `.next` or configured adapter output
4. Set Environment Variable: `NEXT_PUBLIC_API_URL=https://api.worldclassholidays.org/api/v1`
5. Map custom domain: `crm.worldclassholidays.org`
