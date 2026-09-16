import * as esbuild from 'esbuild';
import fs from 'fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

// Tudo do node_modules fica de fora, exceto os pacotes internos @repo/*
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  '@prisma/client',
  '.prisma/client',
].filter((dep) => !dep.startsWith('@repo/'));

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs', // <-- CommonJS padrão e compatível com 100% das libs
  outdir: 'dist',
  external,
});
