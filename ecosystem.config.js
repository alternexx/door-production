module.exports = {
  apps: [
    {
      name: 'door-api',
      script: './backend/server.js',
      cwd: '/Users/homefolder/Projects/door-production',
      env: {
        PORT: 4000,
        DATABASE_URL: 'postgresql://door_user:door_secure_2026@localhost:5432/doordb',
        JWT_SECRET: 'door-production-jwt-secret-2026-mark-alternex-secure',
        NODE_ENV: 'production',
        FRONTEND_URL: 'http://localhost:4001',
      },
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      log_file: '/tmp/door-api.log',
      out_file: '/tmp/door-api-out.log',
      error_file: '/tmp/door-api-err.log',
    },
  ],
};
