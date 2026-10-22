const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const frontendDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(frontendDir, '.next', 'standalone');
const staticSrc = path.join(frontendDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
const publicSrc = path.join(frontendDir, 'public');
const publicDest = path.join(standaloneDir, 'public');

console.log('🚀 Preparing TourFlow Frontend for cPanel Deployment...');

// 1. Verify standalone build exists
if (!fs.existsSync(standaloneDir)) {
  console.error('❌ Error: .next/standalone does not exist. Run "npm run build" first.');
  process.exit(1);
}

// 2. Copy static files into standalone
console.log('📦 Copying .next/static into standalone bundle...');
fs.cpSync(staticSrc, staticDest, { recursive: true });

// 3. Copy public files into standalone
if (fs.existsSync(publicSrc)) {
  console.log('📦 Copying public/ into standalone bundle...');
  fs.cpSync(publicSrc, publicDest, { recursive: true });
}

// 4. Preserve standalone runner as server.standalone.js and sync server.js wrapper
const generatedStandaloneServer = path.join(standaloneDir, 'server.js');
const standaloneBackup = path.join(standaloneDir, 'server.standalone.js');
const rootWrapperServer = path.join(frontendDir, 'server.js');

if (fs.existsSync(generatedStandaloneServer)) {
  console.log('⚡ Preserving standalone server as server.standalone.js...');
  fs.copyFileSync(generatedStandaloneServer, standaloneBackup);
}

if (fs.existsSync(rootWrapperServer)) {
  console.log('⚡ Harmonizing root server.js entrypoint...');
  fs.copyFileSync(rootWrapperServer, generatedStandaloneServer);
}

// 5. Create cpanel-frontend.tar.gz archive
const tarOutput = path.join(frontendDir, 'cpanel-frontend.tar.gz');
console.log('🗜️ Creating cpanel-frontend.tar.gz using standard POSIX tar...');

try {
  execSync(`tar -czf "${tarOutput}" -C "${standaloneDir}" .`, { stdio: 'inherit' });
  const stats = fs.statSync(tarOutput);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Successfully generated cpanel-frontend.tar.gz (${sizeMB} MB)`);
  console.log('\n--- Deployment Instructions ---');
  console.log('1. Upload cpanel-frontend.tar.gz to: /home/worlilff/repos/tourflow/frontend');
  console.log('2. In SSH terminal run:');
  console.log('   cd ~/repos/tourflow/frontend && tar -xzf cpanel-frontend.tar.gz && mkdir -p tmp && touch tmp/restart.txt');
  console.log('   (Or right-click -> Extract in cPanel File Manager and click Restart in Setup Node.js App)');
} catch (err) {
  console.error('❌ Failed to create tar archive:', err.message);
  process.exit(1);
}
