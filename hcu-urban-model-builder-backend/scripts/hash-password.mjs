import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Please provide a password to hash.');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10)

console.log(hash);
