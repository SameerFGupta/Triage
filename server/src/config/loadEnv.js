const path = require('path');
const dotenv = require('dotenv');

let loaded = false;

function loadEnv() {
  if (loaded) {
    return;
  }

  const serverRoot = path.resolve(__dirname, '..', '..');
  const candidatePaths = [
    path.join(serverRoot, '.env'),
    path.join(serverRoot, '..', '.env'),
  ];

  for (const envPath of candidatePaths) {
    dotenv.config({ path: envPath });
  }

  loaded = true;
}

module.exports = {
  loadEnv,
};
