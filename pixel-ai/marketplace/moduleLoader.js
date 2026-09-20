const fs = require('fs');
const path = require('path');

const MARKETPLACE = __dirname;
const installedModules = new Map();

function loadModule(moduleFolder) {
  const manifestPath = path.join(MARKETPLACE, moduleFolder, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return false;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const skillPath = path.join(MARKETPLACE, moduleFolder, manifest.entryPoint || 'skill.js');
    if (!fs.existsSync(skillPath)) return false;
    const skillModule = require(skillPath);
    installedModules.set(manifest.moduleId, { manifest, skill: skillModule });
    console.log(`[Pixel AI] Module métier chargé : ${manifest.name} (${manifest.targetIndustry})`);
    return true;
  } catch (e) {
    console.log(`[Pixel AI] Échec du chargement ${moduleFolder} : ${e.message}`);
    return false;
  }
}

function initMarketplace() {
  installedModules.clear();
  const folders = fs.readdirSync(MARKETPLACE).filter(f => {
    if (f.startsWith('.')) return false;
    const p = path.join(MARKETPLACE, f);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'manifest.json'));
  });
  folders.forEach(folder => loadModule(folder));
}

function listModules() {
  return [...installedModules.values()].map(m => ({
    moduleId: m.manifest.moduleId,
    name: m.manifest.name,
    version: m.manifest.version,
    targetIndustry: m.manifest.targetIndustry,
    author: m.manifest.author
  }));
}

function executeModuleSkill(moduleId, params) {
  const mod = installedModules.get(moduleId);
  if (!mod) return { status: 'error', message: `Le module ${moduleId} n'est pas installé ou actif.` };
  try {
    return { module: moduleId, status: 'success', data: mod.skill.execute(params || {}) };
  } catch (e) {
    return { module: moduleId, status: 'error', message: e.message };
  }
}

function moduleManifest(moduleId) {
  const mod = installedModules.get(moduleId);
  return mod ? mod.manifest : null;
}

function moduleCode(moduleId) {
  const mod = installedModules.get(moduleId);
  if (!mod) return null;
  return fs.readFileSync(path.join(MARKETPLACE, moduleId, mod.manifest.entryPoint || 'skill.js'), 'utf8');
}

initMarketplace();

module.exports = { executeModuleSkill, loadModule, listModules, moduleManifest, moduleCode, initMarketplace };