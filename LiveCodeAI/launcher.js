#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');
const chalk = require('chalk');
const os = require('os');

// Configuration
const SERVER_DIR = path.join(__dirname);
const CLIENT_DIR = path.join(__dirname, 'client');
const SERVER_PORT = 5000;
const CLIENT_PORT = 3000;

// Check for .env file
const fs = require('fs');
const dotenvPath = path.join(SERVER_DIR, '.env');

if (!fs.existsSync(dotenvPath)) {
  console.log(chalk.yellow('No .env file found. Creating one...'));
  fs.writeFileSync(dotenvPath, 'GROQ_API_KEY=\n# Uncomment and add your API key');
  console.log(chalk.green('.env file created successfully!'));
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Banner
console.log(chalk.blue.bold('='.repeat(50)));
console.log(chalk.blue.bold(`
  _     _            _____          _      
 | |   (_)          / ____|        | |     
 | |    ___   _____| |     ___   __| | ___ 
 | |   | \\ \\ / / _ \\ |    / _ \\ / _\` |/ _ \\
 | |___| |\\ V /  __/ |___| (_) | (_| |  __/
 |_____|_| \\_/ \\___|\_____\\___/ \\__,_|\\___|
                                           
`));
console.log(chalk.blue.bold('='.repeat(50)));
console.log(chalk.green(' Starting LiveCode development environment...'));
console.log(chalk.blue.bold('='.repeat(50)));

// Function to run npm command
function runCommand(command, args, cwd, name, color) {
  const proc = spawn(command, args, {
    cwd,
    shell: os.platform() === 'win32', // Use shell on Windows
    stdio: 'pipe'
  });
  
  console.log(chalk[color](`[${name}] Starting...`));

  proc.stdout.on('data', (data) => {
    console.log(chalk[color](`[${name}] ${data.toString().trim()}`));
  });

  proc.stderr.on('data', (data) => {
    console.log(chalk.red(`[${name} ERROR] ${data.toString().trim()}`));
  });

  proc.on('close', (code) => {
    if (code !== 0) {
      console.log(chalk.red(`[${name}] Process exited with code ${code}`));
    } else {
      console.log(chalk[color](`[${name}] Process completed successfully.`));
    }
  });

  return proc;
}

// Check installed dependencies
function checkDependencies() {
  console.log(chalk.yellow('Checking dependencies...'));
  
  try {
    // Check server dependencies
    if (!fs.existsSync(path.join(SERVER_DIR, 'node_modules'))) {
      console.log(chalk.yellow('Installing server dependencies...'));
      const npmCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
      const installProc = spawn(npmCmd, ['install'], {
        cwd: SERVER_DIR,
        stdio: 'inherit',
        shell: os.platform() === 'win32'
      });
      
      return new Promise((resolve) => {
        installProc.on('close', () => {
          console.log(chalk.green('Server dependencies installed.'));
          
          // Check client dependencies
          if (!fs.existsSync(path.join(CLIENT_DIR, 'node_modules'))) {
            console.log(chalk.yellow('Installing client dependencies...'));
            const clientInstallProc = spawn(npmCmd, ['install'], {
              cwd: CLIENT_DIR,
              stdio: 'inherit',
              shell: os.platform() === 'win32'
            });
            
            clientInstallProc.on('close', () => {
              console.log(chalk.green('Client dependencies installed.'));
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    } else if (!fs.existsSync(path.join(CLIENT_DIR, 'node_modules'))) {
      console.log(chalk.yellow('Installing client dependencies...'));
      const npmCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
      const installProc = spawn(npmCmd, ['install'], {
        cwd: CLIENT_DIR,
        stdio: 'inherit',
        shell: os.platform() === 'win32'
      });
      
      return new Promise((resolve) => {
        installProc.on('close', () => {
          console.log(chalk.green('Client dependencies installed.'));
          resolve();
        });
      });
    }
  } catch (error) {
    console.error(chalk.red('Error checking dependencies:'), error);
  }
  
  return Promise.resolve();
}

// Start the server and client
async function startApplication() {
  // Check and install dependencies if needed
  await checkDependencies();
  
  console.log(chalk.green('Starting server and client...'));
  
  // Command to use based on OS
  const npmCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
  
  // Start the server
  const serverProc = runCommand(npmCmd, ['run', 'server'], SERVER_DIR, 'SERVER', 'cyan');
  
  // Give the server a head start
  setTimeout(() => {
    // Start the client
    const clientProc = runCommand(npmCmd, ['start'], CLIENT_DIR, 'CLIENT', 'magenta');
    
    // Display app URLs after a delay
    setTimeout(() => {
      console.log(chalk.green('\n='.repeat(50)));
      console.log(chalk.green(' LiveCode is now running!'));
      console.log(chalk.green(' Server URL: ') + chalk.blue(`http://localhost:${SERVER_PORT}`));
      console.log(chalk.green(' Client URL: ') + chalk.blue(`http://localhost:${CLIENT_PORT}`));
      console.log(chalk.yellow(' Press Ctrl+C to stop all processes'));
      console.log(chalk.green('='.repeat(50)));
    }, 3000);
    
    // Handle kill signal
    const cleanup = () => {
      if (serverProc) serverProc.kill();
      if (clientProc) clientProc.kill();
      rl.close();
      process.exit(0);
    };
    
    // Listen for app termination
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }, 2000);
}

// Add chalk dependency if missing
function ensureChalkInstalled() {
  try {
    require.resolve('chalk');
    startApplication();
  } catch (e) {
    console.log('Installing chalk dependency...');
    const npmCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
    const installProc = spawn(npmCmd, ['install', 'chalk', '--no-save'], {
      cwd: __dirname,
      stdio: 'inherit',
      shell: os.platform() === 'win32'
    });
    
    installProc.on('close', () => {
      console.log('Chalk installed, starting application...');
      startApplication();
    });
  }
}

// Start the application
ensureChalkInstalled(); 