<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1reL0AgPKzW96gftZ7FcMdHiLjzeeNL3-

## Run Locally

**Prerequisites:**  Node.js

### Frontend + Backend Setup

This application now uses a backend Express server to securely handle Gemini API calls, keeping your API key safe and never exposing it in the frontend bundle.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your Gemini API key as an environment variable:
   ```bash
   export GEMINI_API_KEY=your_api_key_here
   ```
   
   Or create a `.env` file in the root directory:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

3. Start the backend server (in one terminal):
   ```bash
   npm run server:start
   ```

4. Start the Angular development server (in another terminal):
   ```bash
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

### Architecture

- **Frontend**: Angular application that runs in the browser
- **Backend**: Express server (TypeScript) that handles API requests to Gemini
- **Security**: API key is stored as an environment variable on the server, never exposed to the client
