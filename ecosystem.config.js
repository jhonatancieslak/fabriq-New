// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

module.exports = {
  apps: [
    {
      name: 'fabriq-api',
      script: 'apps/api/dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 8190,
        HOST: '127.0.0.1',
      },
    },
    {
      name: 'fabriq-web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3190',
      cwd: '/var/www/fabriq/apps/web',
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'fabriq-worker',
      script: 'apps/api/dist/jobs/worker.js',
      instances: 1,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
