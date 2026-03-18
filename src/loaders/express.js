import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import config from '../config/index.js';

export const loadExpress = (app) => {
  app.use(helmet());
  app.use(cors({ origin: config.cors.origin }));
  app.use(compression());
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use(express.json());
};
