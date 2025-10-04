import { spawn } from 'child_process';
import chokidar from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serverProcess = null;

function startServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }

  console.log('🚀 Starting development server...');
  
  serverProcess = spawn('node', ['--loader', 'ts-node/esm', 'src/server.ts'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  });

  serverProcess.on('error', (error) => {
    console.error('❌ Server error:', error);
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.log(`🔄 Server exited with code ${code}, restarting...`);
    }
  });
}

// 监听文件变化
const watcher = chokidar.watch('src/**/*.ts', {
  ignored: /node_modules/,
  persistent: true
});

watcher.on('change', (filePath) => {
  console.log(`📝 File changed: ${filePath}`);
  console.log('🔄 Restarting server...');
  startServer();
});

// 启动服务器
startServer();

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down development server...');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  watcher.close();
  process.exit(0);
});