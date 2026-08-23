// NovaNest - PM2 process manager (Hostinger VPS / Cloud, non-Docker setups)
//
// Setup:
//   npm i -g pm2
//   pm2 start deploy/ecosystem.config.js
//   pm2 save && pm2 startup
//   pm2 logs novanest
//
// Deploy a new version:  pm2 reload novanest --update-env
// The app loads backend/.env itself; set DATA_DIR/UPLOAD_DIR here if you use
// a dedicated data disk.

module.exports = {
  apps: [
    {
      name: "novanest",
      cwd: __dirname + "/..",
      script: "backend/server.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "5s",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        // DATA_DIR: "/data",
        // UPLOAD_DIR: "/data/uploads",
      },
    },
  ],
};
