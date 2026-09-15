module.exports = {
    apps: [
        {
            name: "api",
            cwd: "./apps/api",
            script: "dist/index.js",
            env: {
                NODE_ENV: "production",
                PORT: 3001
            }
        },
        {
            name: "web",
            cwd: "./apps/web",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3000 -H 0.0.0.0",
            env: {
                NODE_ENV: "production",
                PORT: 3000
            }
        }
    ]
};