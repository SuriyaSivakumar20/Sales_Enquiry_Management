
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Firebase App Hosting provides the PORT env var
const PORT = process.env.PORT || 8080; 

// Serve static files from the 'dist' directory (created by vite build)
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing: serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
