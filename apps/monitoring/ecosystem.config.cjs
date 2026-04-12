module.exports = {
  apps: [
    {
      name: 'cafetoolbox-monitoring',
      script: 'worker.mjs',
      cwd: '/opt/cafetoolbox/apps/monitoring',
      interpreter: 'node',
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
