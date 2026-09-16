module.exports = {
  apps: [
    {
      name: 'api',
      cwd: './apps/api',
      script: 'dist/index.js',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'web',
      cwd: './apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3010',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
