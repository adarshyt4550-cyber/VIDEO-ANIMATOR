# AI Video Animator — 2D one-click prototype

A small web app that uploads a short reference clip to the server, sends it to the `fal-ai/wan/v2.7/edit-video` video-to-video model with a fixed 2D cartoon restyling prompt, and displays the returned MP4.

## Requirements
- Node.js 20 or newer
- A fal.ai API key configured as a server-side environment variable
- Internet connection

## Run locally
1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `FAL_KEY` in `.env`.
4. Run `npm start` and open `http://localhost:3000`.

Never commit `.env`, expose the API key in browser code, or upload private footage.

## Current limitations
- MP4/MOV input, 2–10 seconds, maximum 100 MB.
- This first version supports 2D restyling only; 3D mode and long-video chunking are not implemented.
- AI may not preserve every frame, identity, action, or camera movement exactly.
- Provider usage may incur charges. An adult account holder should manage provider credentials and billing.

## Deployment
Deploy as a Node web service using `npm install` and `npm start`, with `FAL_KEY` configured as a secret environment variable. Use HTTPS, authentication, rate limits, quotas, upload retention/deletion controls, and abuse protection before public launch. This is a prototype, not a production-ready public service.
