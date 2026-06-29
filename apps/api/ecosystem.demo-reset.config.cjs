// Desenvolvido por: Jhonatan Cieslak | jhonatan.cieslak94@gmail.com | +351 935 834 214
module.exports = {
  apps: [
    {
      name: 'fabriq-demo-reset',
      script: 'dist/scripts/reset-demo.js',
      cwd: '/var/www/fabriq/apps/api',
      cron_restart: '0 8 * * 1', // toda segunda-feira às 08h00
      watch: false,
      autorestart: false,
      env_file: '/var/www/fabriq/apps/api/.env',
    },
  ],
}
