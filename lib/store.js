// Penyimpanan data berbasis file JSON, sinkron (fs.*Sync), tanpa driver database
// native. Setiap koleksi disimpan sebagai satu file data/<collection>.json berisi
// array objek. Pengaturan (settings) disimpan sebagai satu objek tunggal, bukan array.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');

const DEFAULT_SETTINGS = {
  dendaPerHari: 1000,
  durasiPinjamHari: 7,
  batasAmbilAntreanHari: 2,
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function collectionPath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readAll(collection) {
  ensureDataDir();
  const file = collectionPath(collection);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '[]\n', 'utf8');
    return [];
  }
  const raw = fs.readFileSync(file, 'utf8').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    throw new Error(`Gagal membaca data/${collection}.json: ${err.message}`);
  }
}

function writeAll(collection, arr) {
  ensureDataDir();
  fs.writeFileSync(collectionPath(collection), JSON.stringify(arr, null, 2) + '\n', 'utf8');
}

function findById(collection, id) {
  return readAll(collection).find((item) => item.id === id) || null;
}

function insert(collection, obj) {
  const arr = readAll(collection);
  const now = new Date().toISOString();
  const record = Object.assign({ id: crypto.randomUUID(), createdAt: now }, obj);
  arr.push(record);
  writeAll(collection, arr);
  return record;
}

function update(collection, id, patch) {
  const arr = readAll(collection);
  const idx = arr.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  arr[idx] = Object.assign({}, arr[idx], patch, { updatedAt: new Date().toISOString() });
  writeAll(collection, arr);
  return arr[idx];
}

function remove(collection, id) {
  const arr = readAll(collection);
  const next = arr.filter((item) => item.id !== id);
  if (next.length === arr.length) return false;
  writeAll(collection, next);
  return true;
}

function getSettings() {
  ensureDataDir();
  const file = collectionPath('settings');
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(DEFAULT_SETTINGS, null, 2) + '\n', 'utf8');
    return Object.assign({}, DEFAULT_SETTINGS);
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Object.assign({}, DEFAULT_SETTINGS, parsed);
  } catch (err) {
    throw new Error(`Gagal membaca data/settings.json: ${err.message}`);
  }
}

function updateSettings(patch) {
  const current = getSettings();
  const next = Object.assign({}, current, patch);
  fs.writeFileSync(collectionPath('settings'), JSON.stringify(next, null, 2) + '\n', 'utf8');
  return next;
}

module.exports = {
  DATA_DIR,
  readAll,
  writeAll,
  findById,
  insert,
  update,
  remove,
  getSettings,
  updateSettings,
};
