import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import router from './routes/index';

const app = express();

app.use(cors({
  origin: [env.frontendUrl, 'http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api', router);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erro interno do servidor.',
  });
});

app.listen(env.port, () => {
  console.log(`Servidor rodando na porta ${env.port}`);
});

export default app;
