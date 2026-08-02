// E2E packaging test: install from tarball, start server, verify API + frontend
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-e2e-'));
  console.log('Test dir:', tmpDir);

  // Create test TODO.md
  fs.writeFileSync(path.join(tmpDir, 'TODO.md'),
    '# Test Project\n\n## Tasks\n- [ ] **One** — First\n- [x] **Two** — Done\n', 'utf-8');

  // Install from tarball
  const tarball = path.join(__dirname, '..', 'md-kanban-0.1.0.tgz');
  execSync(`npm install "${tarball}"`, { cwd: tmpDir, stdio: 'pipe' });
  console.log('✅ Installed from tarball');

  // Use a random high port to avoid conflicts
  const port = 45000 + Math.floor(Math.random() * 5000);

  // Spawn server
  const server = spawn('node', [
    path.join(tmpDir, 'node_modules', 'kanban-md', 'server.js'),
    '--file', 'TODO.md',
    '--no-open',
    '--port', String(port)
  ], { cwd: tmpDir, stdio: 'pipe' });

  server.stdout.on('data', d => console.log('   ', d.toString().trim()));
  server.stderr.on('data', d => console.error('ERR:', d.toString().trim()));

  // Wait for server to start, then test
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const baseUrl = `http://localhost:${port}`;
    const health = await fetch(`${baseUrl}/api/health`).then(r => r.json());
    console.log('✅ Health:', JSON.stringify(health));
    if (health.status !== 'ok' || health.cards !== 2) {
      throw new Error(`Unexpected health: ${JSON.stringify(health)}`);
    }

    const html = await fetch(`${baseUrl}/`).then(r => r.text());
    if (!html.includes('id="root"')) throw new Error('Frontend not served');
    console.log('✅ Frontend served');

    // Test add card
    const card = await fetch(`${baseUrl}/api/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ columnId: 'tasks', title: 'From E2E', description: 'test' })
    }).then(r => r.json());
    console.log('✅ Added card:', card.title);

    // Verify file was updated
    const updated = fs.readFileSync(path.join(tmpDir, 'TODO.md'), 'utf-8');
    if (!updated.includes('From E2E')) throw new Error('File not updated');
    console.log('✅ File updated');

    console.log('\n🎉 E2E test PASSED — md-kanban works from npm pack');
  } catch (e) {
    console.error('❌', e.message);
    process.exitCode = 1;
  } finally {
    server.kill();
    try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) { }
  }
}

main();
