import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

app.get('/', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Secudex server listening on http://${HOST}:${PORT}`);
});
