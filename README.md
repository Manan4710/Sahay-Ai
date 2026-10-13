# Sahay – AI Chat Assistant

A ChatGPT-style chat website. Frontend: HTML, CSS, JavaScript. Backend: one Netlify Function that calls the Google Gemini API.

## Features
- Chat interface with typing indicator
- Answers shown as formatted text (headings, lists, tables, code blocks with Copy button)
- Chat history saved in the browser, new chat / delete chat
- Light and dark theme, works on mobile
- API key kept secret on the server

## Project structure
- `index.html`, `style.css`, `script.js` – the website
- `netlify/functions/chat.js` – calls the Gemini API
- `netlify.toml` – tells Netlify where the function is

## Setup
1. Get a free API key at https://aistudio.google.com/apikey
2. Push this folder to GitHub
3. On Netlify: Add new site > Import from Git > pick the repo > Deploy
4. Site settings > Environment variables > add `GEMINI_API_KEY` = your key
5. Deploys > Trigger deploy > Deploy site

Never paste the API key into any file in this project.
