import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Serve static assets from project root
app.use(express.static(__dirname));

// Fallback to index.html for any unhandled routes
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: __dirname });
});

app.listen(PORT, HOST, () => {
  console.log(`SNES Emulator running at http://${HOST}:${PORT}`);
});
