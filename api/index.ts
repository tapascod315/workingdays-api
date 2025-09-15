import express from 'express';
import serverless from 'serverless-http';

const app = express();
app.get('/', (_req, res) => res.json({ ok: true, from: 'express' }));

export default serverless(app);