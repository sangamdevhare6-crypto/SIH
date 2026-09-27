function info(msg, ...args) {
  console.log(`\x1b[36m[INFO ${new Date().toISOString().substring(11, 19)}]\x1b[0m ${msg}`, ...args);
}

function success(msg, ...args) {
  console.log(`\x1b[32m[SUCCESS ${new Date().toISOString().substring(11, 19)}]\x1b[0m ${msg}`, ...args);
}

function warn(msg, ...args) {
  console.warn(`\x1b[33m[WARN ${new Date().toISOString().substring(11, 19)}]\x1b[0m ${msg}`, ...args);
}

function error(msg, ...args) {
  console.error(`\x1b[31m[ERROR ${new Date().toISOString().substring(11, 19)}]\x1b[0m ${msg}`, ...args);
}

module.exports = {
  info,
  success,
  warn,
  error
};
