import pino, { type LoggerOptions } from 'pino';

const isDev = process.env['NODE_ENV'] !== 'production';

export function createLogger(name: string) {
  const options: LoggerOptions = {
    name,
    level: process.env['LOG_LEVEL'] ?? (isDev ? 'debug' : 'info'),
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  };

  if (isDev) {
    options.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    };
  } else {
    options.base = { service: name };
  }

  return pino(options);
}

export type Logger = ReturnType<typeof createLogger>;
