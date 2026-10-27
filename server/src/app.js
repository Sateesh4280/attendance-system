import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { ApiError } from './utils/ApiError.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));

const allowedOrigins = [process.env.CLIENT_URL, process.env.RENDER_EXTERNAL_URL]
  .filter(Boolean)
  .join(',')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use((req, res, next) => {
  cors({
    origin(origin, callback) {
      // Requests without an Origin header (curl, health checks, same-origin GET)
      // are always allowed. Same-origin browser requests and allow-listed
      // origins (the separately deployed frontend) are allowed as well.
      if (!origin) return callback(null, true);

      const requestOrigin = `${req.protocol}://${req.get('host')}`;
      const cleanOrigin = origin.replace(/\/$/, '');

      if (
        cleanOrigin === requestOrigin ||
        allowedOrigins.includes('*') ||
        allowedOrigins.includes(cleanOrigin)
      ) {
        return callback(null, true);
      }

      return callback(new ApiError(403, `Origin ${origin} is not allowed by CORS`));
    },
  })(req, res, next);
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.use('/api', routes);

// In production (and whenever a client build exists) the API also serves the
// React single-page app, so a single Render service can host the whole project.
if (fs.existsSync(clientDist)) {
  app.use(
    express.static(clientDist, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    return res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'Student Attendance Management System API',
      hint: 'Build the React client to serve the dashboard from this server.',
    });
  });
}

app.use(notFound);
app.use(errorHandler);

export default app;
