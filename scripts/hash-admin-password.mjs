import { randomBytes, pbkdf2Sync } from 'node:crypto';
import readline from 'node:readline';
if (!process.stdin.isTTY) throw Error('Run in an interactive terminal. Password arguments and environment variables are not accepted.');
process.stdout.write('New administrator password (hidden; at least 12 characters): ');
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true); process.stdin.resume();
let password = '';
process.stdin.on('keypress', (str, key) => {
  if (key?.ctrl && key.name === 'c') { process.stdin.setRawMode(false); process.exit(130); }
  if (key?.name === 'return') {
    process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n');
    if (password.length < 12) { console.error('Use at least 12 characters. Nothing was saved.'); process.exit(1); }
    const salt = randomBytes(16), hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex'); password = '';
    console.log(`ADMIN_PASSWORD_HASH=pbkdf2:100000:${salt.toString('hex')}:${hash}`);
    console.log('Store this value in .dev.vars locally or your deployment secret manager. Do not commit it.');
    process.exit(0);
  }
  if (key?.name === 'backspace') { password = password.slice(0, -1); return; }
  if (str && !key?.ctrl && !key?.meta) password += str;
});
