const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');

function application(name, cwd, script, env, maxMemoryRestart) {
  return {
    name,
    cwd: path.join(repositoryRoot, cwd),
    script: path.join(repositoryRoot, script),
    interpreter: 'node',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    restart_delay: 3000,
    min_uptime: '10s',
    max_restarts: 10,
    kill_timeout: 15000,
    listen_timeout: 15000,
    max_memory_restart: maxMemoryRestart,
    time: true,
    env,
  };
}

module.exports = {
  apps: [
    application(
      'matex-api',
      'backend',
      'backend/dist/server/app.js',
      {
        NODE_ENV: 'production',
        PORT: '9200',
      },
      '512M',
    ),
    application(
      'matex-public',
      'frontend/public',
      'frontend/public/dist/matex-public/server/server.mjs',
      {
        NODE_ENV: 'production',
        PORT: '9201',
        MATEX_API_INTERNAL_URL: 'http://127.0.0.1:9200',
        MATEX_PUBLIC_INTERNAL_URL: 'http://127.0.0.1:9201',
      },
      '768M',
    ),
    application(
      'matex-admin',
      'frontend/admin',
      'frontend/admin/dist/matex-admin/server/server.mjs',
      {
        NODE_ENV: 'production',
        PORT: '9202',
        MATEX_API_INTERNAL_URL: 'http://127.0.0.1:9200',
        MATEX_ADMIN_INTERNAL_URL: 'http://127.0.0.1:9202',
      },
      '768M',
    ),
  ],
};
