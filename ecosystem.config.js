// Desenvolvimento: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214

module.exports = {
  apps: [
    {
      name: 'fabriq-api',
      script: '/var/www/fabriq/apps/api/dist/main.js',
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
      script: '/var/www/fabriq/apps/web/node_modules/.bin/next',
      args: 'start -p 3190',
      cwd: '/var/www/fabriq/apps/web',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'https://api.fabriq.pt',
        NEXT_PUBLIC_APP_URL: 'https://novo.fabriq.pt',
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
