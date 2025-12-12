import 'dotenv/config';
import express from 'express';
import geminiRouter from './routes/gemini';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use('/api/gemini', geminiRouter);

// Serve static frontend build if present (optional)
app.use(express.static(path.join(__dirname, '..', 'dist')));

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
