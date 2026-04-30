
const supabaseUrl = 'https://zwojzzrlssehyvcykkbw.supabase.co';
const supabaseKey = 'sb_publishable_s6SMB4WYqzHIoH8reG8_Zg_DWJ_x31Y';
const supabase = window.supabase ? window.supabase.createClient(supabaseUrl, supabaseKey) : null;
let currentUser = null;

function updateAuthUI() {
  const btn = document.getElementById('auth-status');
  if(btn) {
    btn.textContent = currentUser ? 'Logout' : 'Login Cloud';
    btn.style.color = currentUser ? '#e74c3c' : '#4d8fe7';
    btn.style.background = currentUser ? 'rgba(231,76,60,0.1)' : 'rgba(77,143,231,0.1)';
  }
}

async function loadTeams() {
  if (currentUser && supabase) {
    const { data, error } = await supabase.from('teams').select('id, team_data').eq('user_id', currentUser.id).maybeSingle();
    if (data && data.team_data) {
      state.teams = data.team_data;
      state.cloudRecordId = data.id; 
    } else {
      state.teams = [];
      state.cloudRecordId = null;
    }
  } else {
    const saved = JSON.parse(localStorage.getItem('teams') || '[]');
    state.teams = Array.isArray(saved) ? saved : [];
  }
  if (state.teams.length > 0) {
     state.selTeamId = state.teams[0].id;
  } else {
     state.selTeamId = null;
  }
  renderAll();
}

const TYPE_COLORS = { Normal:'#A8A77A', Fire:'#EE8130', Water:'#6390F0', Electric:'#F7D02C', Grass:'#7AC74C', Ice:'#96D9D6', Fighting:'#C22E28', Poison:'#A33EA1', Ground:'#E2BF65', Flying:'#A98FF3', Psychic:'#F95587', Bug:'#A6B91A', Rock:'#B6A136', Ghost:'#735797', Dragon:'#6F35FC', Dark:'#705746', Steel:'#B7B7CE', Fairy:'#D685AD' };
const STAT_ORDER = ['HP','ATK','DEF','SpATK','SpDEF','SPE'];
const MAX_TOTAL_SP = 66;
const MAX_STAT_SP = 32;
const $ = s => document.querySelector(s);
let state = { teams: [], selTeamId: null, selSlotIdx: 0, data: {} };

async function loadJson(path) { const r = await fetch(path); return r.json(); }

async function init() {
  const [pokemon, items, natures, abilities, moves] = await Promise.all([
    loadJson('src/data/pokemon.json'), loadJson('src/data/items.json'), loadJson('src/data/natures.json'), loadJson('src/data/abilities.json'), loadJson('src/data/moves.json')
  ]);
  state.data = { pokemon, items, natures, abilities, moves };
  wireEvents();

  if(supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
  }
  updateAuthUI();
  await loadTeams();
}

async function persist() {
  localStorage.setItem('teams', JSON.stringify(state.teams));
  if (currentUser && supabase) {
    if (state.cloudRecordId) {
      await supabase.from('teams').update({ team_data: state.teams }).eq('id', state.cloudRecordId);
    } else {
      const { data, error } = await supabase.from('teams').insert({ user_id: currentUser.id, team_data: state.teams }).select().single();
      if (data) state.cloudRecordId = data.id;
    }
  }
}
const getTeam = () => state.teams.find(t => t.id === state.selTeamId);
const getSlot = () => { const t = getTeam(); return t ? t.slots[state.selSlotIdx] : null; };
const getPokemon = () => state.data.pokemon.find(p => p.name === getSlot()?.pokemon);
const getActiveForm = () => {
  const p = getPokemon(); const s = getSlot(); if(!p||!s) return null;
  if (s.isMega) return p.megaOptions ? p.megaOptions.find(m => m.stone === s.item) || p : p.mega || p;
  return p;
};

function wireEvents() {

  // Auth Events
  const authModal = document.getElementById('modal-auth');
  const btnAuth = document.getElementById('auth-status');
  if (btnAuth) {
    btnAuth.onclick = async () => {
      if (currentUser && supabase) {
        if(confirm('Vuoi eseguire il Logout? Tornerai ai tuoi team locali.')) {
          await supabase.auth.signOut();
          currentUser = null;
          updateAuthUI();
          await loadTeams();
        }
      } else {
        if(authModal) authModal.classList.remove('hidden');
      }
    };
  }

  if (document.getElementById('btn-auth-cancel')) {
    document.getElementById('btn-auth-cancel').onclick = () => authModal.classList.add('hidden');
  }

  if (document.getElementById('btn-login')) {
    document.getElementById('btn-login').onclick = async () => {
      if(!supabase) return alert("Supabase non configurato");
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value.trim();
      if(!email || !password) return alert('Inserisci email e password');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if(error) return alert('Errore: ' + error.message);
      currentUser = data.user;
      updateAuthUI();
      authModal.classList.add('hidden');
      await loadTeams();
      alert('Login effettuato! Team cloud caricati.');
    };
  }

  if (document.getElementById('btn-register')) {
    document.getElementById('btn-register').onclick = async () => {
      if(!supabase) return alert("Supabase non configurato");
      const email = document.getElementById('auth-email').value.trim();
      const password = document.getElementById('auth-password').value.trim();
      if(!email || !password) return alert('Inserisci email e password');
      const { data, error } = await supabase.auth.signUp({ email, password });
      if(error) return alert('Errore: ' + error.message);
      alert('Registrazione completata! Ora puoi fare il Login.');
    };
  }
  
  // Export Logic
  const btnExport = document.getElementById('btn-export');
  if(btnExport) {
    btnExport.onclick = () => {
      if(!state.selTeamId) return alert('Seleziona un team prima di esportare!');
      const team = state.teams.find(t => t.id === state.selTeamId);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(team, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", (team.name || "team") + "_export.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    };
  }

  // Import Logic
  const btnImport = document.getElementById('btn-import');
  const fileImport = document.getElementById('file-import');
  if(btnImport && fileImport) {
    btnImport.onclick = () => fileImport.click();
    fileImport.onchange = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const importedTeam = JSON.parse(ev.target.result);
          // Very basic validation
          if(!importedTeam.id || !importedTeam.name || !Array.isArray(importedTeam.slots)) {
            return alert('File team non valido!');
          }
          // Generate a new unique ID to avoid conflicts if importing the same team twice
          importedTeam.id = Date.now().toString(); 
          state.teams.push(importedTeam);
          state.selTeamId = importedTeam.id;
          state.selSlotIdx = 0;
          await persist();
          renderAll();
          alert('Team importato con successo!');
        } catch(err) {
          alert('Errore durante la lettura del file JSON!');
        }
        fileImport.value = ''; // Reset input
      };
      reader.readAsText(file);
    };
  }

  $('#btn-new').onclick = () => $('#modal-backdrop').classList.remove('hidden');
  $('#modal-cancel').onclick = () => $('#modal-backdrop').classList.add('hidden');
  $('#modal-confirm').onclick = async () => {
    const name = $('#team-name-input').value.trim(); if(!name) return;
    const t = { id: crypto.randomUUID(), name, slots: Array.from({length:6}, ()=>({pokemon:'',isMega:false,ability:'',nature:'Serious',item:'',moves:Array.from({length:4},()=>['','']),sp:{HP:0,ATK:0,DEF:0,SpATK:0,SpDEF:0,SPE:0}})) };
    state.teams.push(t); state.selTeamId = t.id; state.selSlotIdx = 0; $('#modal-backdrop').classList.add('hidden'); $('#team-name-input').value='';
    await persist(); renderAll();
  };
  $('#btn-delete').onclick = async () => {
    if(!state.selTeamId) return;
    document.getElementById('delete-modal-backdrop').style.display = 'flex';
  };

  const deleteModalEl = document.createElement('div');
  deleteModalEl.id = 'delete-modal-backdrop';
  deleteModalEl.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:9999; display:none;';
  deleteModalEl.innerHTML = `
    <div style="background:#1a1f2e; border:1px solid #e03e3e; border-radius:12px; padding:32px 40px; min-width:360px; text-align:center; box-shadow: 0 8px 32px rgba(0,0,0,0.6);">
      <div style="font-size:28px; margin-bottom:12px;">🗑️</div>
      <div style="font-size:18px; font-weight:bold; color:#fff; margin-bottom:8px;">Delete Team?</div>
      <div style="color:#aaa; margin-bottom:28px; font-size:14px;">This action is permanent and cannot be undone.</div>
      <div style="display:flex; gap:12px; justify-content:center;">
        <button id="delete-modal-cancel" style="padding:10px 28px; border-radius:8px; border:1px solid #555; background:#2a2f3e; color:#ccc; cursor:pointer; font-size:14px; font-weight:bold;">Cancel</button>
        <button id="delete-modal-confirm" style="padding:10px 28px; border-radius:8px; border:none; background:#e03e3e; color:#fff; cursor:pointer; font-size:14px; font-weight:bold;">Confirm Delete</button>
      </div>
    </div>
  `;
  document.body.appendChild(deleteModalEl);
  document.getElementById('delete-modal-cancel').onclick = () => { deleteModalEl.style.display = 'none'; };
  document.getElementById('delete-modal-confirm').onclick = async () => {
    deleteModalEl.style.display = 'none';
    state.teams = state.teams.filter(t => t.id !== state.selTeamId);
    state.selTeamId = state.teams[0]?.id || null; state.selSlotIdx = 0;
    await persist(); renderAll();
  };

  $('#btn-save').onclick = async () => { await persist(); $('#team-status').textContent='Saved!'; setTimeout(()=>$('#team-status').textContent='Ready',1000); };
  $('#team-select').onchange = e => { state.selTeamId = e.target.value; state.selSlotIdx = 0; renderAll(); };
  $('#mega-toggle').onclick = async () => {
    const s = getSlot(); const p = getPokemon(); if(!s||!p||!canMega(p, s.item, s.ability)) return;
    s.isMega = !s.isMega;
    const f = getActiveForm(); s.ability = s.isMega && f.ability ? f.ability : p.abilities[0];
    await persist(); renderAll();
  };
  $('#ability-select').onchange = async e => { 
    const s=getSlot(); const p=getPokemon();
    if(s) {
        s.ability=e.target.value; 
        if(p && p.name === 'Palafin (Zero Form)' && s.ability !== 'Zero to Hero') s.isMega = false;
        if(p && p.name === 'Aegislash (Shield)' && s.ability !== 'Stance Change') s.isMega = false;
        await persist(); renderSetup();
    } 
  };
  $('#nature-select').onchange = async e => { const s=getSlot(); if(s) {s.nature=e.target.value; await persist(); renderStats();} };
}

function renderAll() {
  const ts = $('#team-select');
  ts.innerHTML = state.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  if (state.selTeamId) ts.value = state.selTeamId;
  $('#current-team-name').textContent = getTeam()?.name || 'No team';

  const g = $('#slots-grid');
  g.innerHTML = getTeam() ? getTeam().slots.map((s,i) => {
    const act = i === state.selSlotIdx ? 'active' : '';

    // Safely define the sprite URL generator inline
    const getSpriteUrl = (pname, isMega) => {
      let n = pname.toLowerCase().replace(/[^a-z0-9]/g, '');

      // We need to inject the hyphen exactly where Showdown expects it.
      // Common forms:
      if (n.includes('basculegionfemale')) n = 'basculegion-f';
      else if (n.includes('basculegionmale')) n = 'basculegion';
      else if (n.includes('meowsticfemale')) n = 'meowstic-f';
      else if (n.includes('meowsticmale')) n = 'meowstic';
      else if (n.includes('lycanrocdusk')) n = 'lycanroc-dusk';
      else if (n.includes('lycanrocmidnight')) n = 'lycanroc-midnight';
      else if (n.includes('lycanrocmidday')) n = 'lycanroc';
      else if (n.includes('palafinzeroform')) n = isMega ? 'palafin-hero' : 'palafin';
      else if (n.includes('aegislashshield')) n = isMega ? 'aegislash-blade' : 'aegislash';
      else if (n.includes('gourgeistsmall')) n = 'gourgeist-small';
      else if (n.includes('gourgeistlarge')) n = 'gourgeist-large';
      else if (n.includes('gourgeistsuper')) n = 'gourgeist-super';
      else if (n.includes('gourgeistaverage')) n = 'gourgeist';
      else if (n.includes('rotomheat')) n = 'rotom-heat';
      else if (n.includes('rotomwash')) n = 'rotom-wash';
      else if (n.includes('rotomfrost')) n = 'rotom-frost';
      else if (n.includes('rotomfan')) n = 'rotom-fan';
      else if (n.includes('rotommow')) n = 'rotom-mow';
      else if (n.includes('taurosaqua')) n = 'tauros-paldeaaqua';
      else if (n.includes('taurosblaze')) n = 'tauros-paldeablaze';
      else if (n.includes('tauroscombat')) n = 'tauros-paldeacombat';
      else if (n.includes('alolan')) n = n.replace('alolan', '') + '-alola';
      else if (n.includes('galarian')) n = n.replace('galarian', '') + '-galar';
      else if (n.includes('hisuian')) n = n.replace('hisuian', '') + '-hisui';
      else if (n.includes('paldean')) n = n.replace('paldean', '') + '-paldea';

      // Megas
      if (isMega && n.includes('charizard') && n.includes('x')) n = 'charizard-megax';
      else if (isMega && n.includes('charizard') && n.includes('y')) n = 'charizard-megay';
      else if (isMega && n.includes('mewtwo') && n.includes('x')) n = 'mewtwo-megax';
      else if (isMega && n.includes('mewtwo') && n.includes('y')) n = 'mewtwo-megay';
      else if (isMega && !n.includes('-hero') && !n.includes('-blade')) n = n + '-mega';

      return {
        local: `src/assets/sprites/${n}.gif`,
        showdown: `https://play.pokemonshowdown.com/sprites/gen5/${n}.png`
      };
    };

    if (s.pokemon) {
        const spriteUrls = getSpriteUrl(s.pokemon, s.isMega);
        let name = s.pokemon;
        if(s.isMega && name === 'Palafin (Zero Form)') name = 'Palafin (Hero)';
        else if(s.isMega && name === 'Aegislash (Shield)') name = 'Aegislash (Blade)';
        else if(s.isMega) name = 'Mega ' + name;

        const spArr = [];
        if(s.sp.HP > 0) spArr.push(`${s.sp.HP} HP`);
        if(s.sp.ATK > 0) spArr.push(`${s.sp.ATK} Atk`);
        if(s.sp.DEF > 0) spArr.push(`${s.sp.DEF} Def`);
        if(s.sp.SpATK > 0) spArr.push(`${s.sp.SpATK} SpA`);
        if(s.sp.SpDEF > 0) spArr.push(`${s.sp.SpDEF} SpD`);
        if(s.sp.SPE > 0) spArr.push(`${s.sp.SPE} Spe`);
        const spDisplay = spArr.length > 0 ? spArr.join(' ') : '0 SP';

        const natObj = state.data.natures.find(n=>n.name===s.nature);
        let natStr = s.nature;
        if(natObj && natObj.up) natStr = `${s.nature} (+${natObj.up} -${natObj.down})`;

        return `<div class="slot-card ${act}" onclick="state.selSlotIdx=${i}; renderAll();" style="padding:6px; display:flex; align-items:center; gap:8px; cursor:pointer;">
            <img src="${spriteUrls.local}" style="width:48px; height:48px; object-fit:contain; flex-shrink:0;" onerror="if(this.dataset.fallback!=='1'){this.dataset.fallback='1';this.src='${spriteUrls.showdown}';}else{this.style.display='none';}" />
            <div style="flex:1; display:flex; flex-direction:column; justify-content:center; overflow:hidden;">
              <div style="font-weight:bold; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:14px; margin-bottom:2px;">${name}</div>
              <div style="font-size:11px; color:#aaa; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; line-height:1.2;">
                ${s.ability || 'No Ability'} | ${s.item || 'No Item'}
              </div>
              <div style="font-size:11px; color:#88ff88; margin-top:2px;">${spDisplay} | ${natStr}</div>
            </div>
        </div>`;
    } else {
        return `<div class="slot-card ${act}" onclick="state.selSlotIdx=${i}; renderAll();" style="padding:12px; color:#888; text-align:center; cursor:pointer;">
            <b>Slot ${i+1}</b><br/>Empty
        </div>`;
    }
  }).join('') : '';

  renderPokemonList(); renderItemPicker(); renderSetup(); renderMoves();
  renderDefensiveProfile(); renderStats();
}

window.filterPokeList = (query) => { renderPokemonList(query); };

function renderPokemonList(filterStr = '') {
  const s = getSlot();
  const q = filterStr.toLowerCase();

  $('#pokemon-list').innerHTML = state.data.pokemon.filter(p => p.name.toLowerCase().includes(q)).map(p => {
    const act = s?.pokemon === p.name ? 'selected' : '';
    const chps = p.types.map(t=>`<span class="tc" style="background:${TYPE_COLORS[t]||'#777'}">${t}</span>`).join('');
    return `<div class="picker-item ${act}" onclick="selectPokemon('${p.name.replace(/'/g, "\'")}')"><span>${p.name}</span><div class="tc-wrap">${chps}</div></div>`;
  }).join('');
}
async function selectPokemon(name) {
  const s = getSlot(); const p = state.data.pokemon.find(x=>x.name===name); if(!s||!p) return;
  s.pokemon = p.name; s.isMega=false; s.ability=p.abilities[0]; s.item=''; s.moves=Array.from({length:4},()=>['','']);
  await persist(); renderAll();
}

function canMega(p, item, ability) {
  if(!p) return false;
  if(p.name === 'Palafin (Zero Form)' && ability === 'Zero to Hero') return true;
  if(p.name === 'Aegislash (Shield)' && ability === 'Stance Change') return true;
  if(!item) return false;
  if(p.megaOptions) return p.megaOptions.some(m=>m.stone===item);
  return state.data.items.megaStones.some(m=>m.pokemon===p.name && m.name===item);
}

function renderItemPicker() {
  const s = getSlot(); const p = getPokemon();
  if(!s||!p) { $('#item-list').innerHTML=''; $('#item-desc').textContent=''; return; }
  let html = `<div class="picker-group">Hold Items</div>`;
  state.data.items.holdItems.forEach(i => html+=`<div class="picker-item ${s.item===i.name?'selected':''}" onclick="selectItem('${i.name.replace(/'/g, "\'")}')">${i.name}</div>`);
  html += `<div class="picker-group">Berries</div>`;
  state.data.items.berries.forEach(i => html+=`<div class="picker-item ${s.item===i.name?'selected':''}" onclick="selectItem('${i.name}')">${i.name}</div>`);
  const megas = state.data.items.megaStones.filter(m=>m.pokemon===p.name);
  if (megas.length) {
    html += `<div class="picker-group">Mega Stones</div>`;
    megas.forEach(i => html+=`<div class="picker-item ${s.item===i.name?'selected':''}" onclick="selectItem('${i.name.replace(/'/g, "\'")}')">${i.name}</div>`);
  }
  $('#item-list').innerHTML = html;

  let desc = '';
  const allItems = [...state.data.items.holdItems, ...state.data.items.berries];
  const fItem = allItems.find(x=>x.name===s.item);
  if(fItem) desc=fItem.desc; else if(megas.some(m=>m.name===s.item)) desc=`Allows ${p.name} to Mega Evolve.`;
  $('#item-desc').textContent = desc;
}
window.selectItem = async (name) => {
  const s = getSlot(); const p = getPokemon(); if(!s) return;
  s.item = name; if(!canMega(p, name, s.ability)) s.isMega=false;
  await persist(); renderAll();
}

function renderSetup() {
  const s = getSlot(); const p = getPokemon(); const f = getActiveForm();
  const imgBox = document.getElementById('sprite-box');
  const megaBtn = $('#mega-toggle');

  if (imgBox) {
    if (!s || !s.pokemon || !p || !f) {
      imgBox.innerHTML = 'No Pokémon selected';
    } else {
      const getSpriteUrl = (pname, isMega) => {
        let n = pname.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (n.includes('basculegionfemale')) n = 'basculegion-f';
        else if (n.includes('basculegionmale')) n = 'basculegion';
        else if (n.includes('meowsticfemale')) n = 'meowstic-f';
        else if (n.includes('meowsticmale')) n = 'meowstic';
        else if (n.includes('lycanrocdusk')) n = 'lycanroc-dusk';
        else if (n.includes('lycanrocmidnight')) n = 'lycanroc-midnight';
        else if (n.includes('lycanrocmidday')) n = 'lycanroc';
        else if (n.includes('palafinzeroform')) n = isMega ? 'palafin-hero' : 'palafin';
        else if (n.includes('aegislashshield')) n = isMega ? 'aegislash-blade' : 'aegislash';
        else if (n.includes('gourgeistsmall')) n = 'gourgeist-small';
        else if (n.includes('gourgeistlarge')) n = 'gourgeist-large';
        else if (n.includes('gourgeistsuper')) n = 'gourgeist-super';
        else if (n.includes('gourgeistaverage')) n = 'gourgeist';
        else if (n.includes('rotomheat')) n = 'rotom-heat';
        else if (n.includes('rotomwash')) n = 'rotom-wash';
        else if (n.includes('rotomfrost')) n = 'rotom-frost';
        else if (n.includes('rotomfan')) n = 'rotom-fan';
        else if (n.includes('rotommow')) n = 'rotom-mow';
        else if (n.includes('taurosaqua')) n = 'tauros-paldeaaqua';
        else if (n.includes('taurosblaze')) n = 'tauros-paldeablaze';
        else if (n.includes('tauroscombat')) n = 'tauros-paldeacombat';
        else if (n.includes('alolan')) n = n.replace('alolan', '') + '-alola';
        else if (n.includes('galarian')) n = n.replace('galarian', '') + '-galar';
        else if (n.includes('hisuian')) n = n.replace('hisuian', '') + '-hisui';
        else if (n.includes('paldean')) n = n.replace('paldean', '') + '-paldea';

        if (isMega && n.includes('charizard') && n.includes('x')) n = 'charizard-megax';
        else if (isMega && n.includes('charizard') && n.includes('y')) n = 'charizard-megay';
        else if (isMega && n.includes('mewtwo') && n.includes('x')) n = 'mewtwo-megax';
        else if (isMega && n.includes('mewtwo') && n.includes('y')) n = 'mewtwo-megay';
        else if (isMega && !n.includes('-hero') && !n.includes('-blade')) n = n + '-mega';

        return `src/assets/sprites/${n}.gif`;
      };

      let displayName = s.pokemon;
      if (s.isMega && displayName === 'Palafin (Zero Form)') displayName = 'Palafin (Hero)';
      else if (s.isMega && displayName === 'Aegislash (Shield)') displayName = 'Aegislash (Blade)';
      else if (s.isMega) displayName = 'Mega ' + displayName;

      const tcs = (f.types || []).map(t => `<span class="tc" style="background:${TYPE_COLORS[t]||'#777'}">${t}</span>`).join('');
      const aniUrl = getSpriteUrl(s.pokemon, s.isMega);
      const dexUrl = `./assets/sprites/${aniUrl.split('/').pop().replace('.gif','.png')}`;

      imgBox.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:space-between; width:100%; height:100%; text-align:center;">
          <div style="flex:1; display:flex; align-items:center; justify-content:center; width:100%; padding:20px;">
             <img src="${aniUrl}" style="max-width:90%; max-height:140px; image-rendering:pixelated; object-fit:contain; filter:drop-shadow(2px 4px 12px rgba(0,0,0,0.7)); transform:scale(1.15);" onerror="this.onerror=null;this.src='${dexUrl}'" />
          </div>
          <div style="width:100%; padding:20px 10px; margin-top:auto; position:relative;">
            <div style="position:absolute; bottom:0; left:0; right:0; top:-20px; background:linear-gradient(to bottom, transparent, #080c13 30%); pointer-events:none;"></div>
            <div style="position:relative; z-index:1;">
              <div style="font-weight:800; font-size:18px; line-height:1.2; margin-bottom:8px; letter-spacing:0.02em;">${displayName}</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:center;">${tcs}</div>
            </div>
          </div>
        </div>`;
    }
  }

  megaBtn.classList.toggle('hidden', !(p && canMega(p, s?.item, s?.ability)));
  megaBtn.classList.toggle('active', !!(s?.isMega));
  if (p && p.name === 'Palafin (Zero Form)') megaBtn.textContent = 'HERO Form';
  else if (p && p.name === 'Aegislash (Shield)') megaBtn.textContent = 'BLADE Form';
  else megaBtn.textContent = 'Mega Evolution';

  if(!s||!f) {
    $('#ability-select').innerHTML='';
    const adb = document.getElementById('ability-desc-text') || document.getElementById('ability-desc');
    if (adb) adb.textContent='';
    $('#nature-select').innerHTML='';
    return;
  }

  const baseForm = state.data.pokemon.find(po=>po.name===s.pokemon);
  let abs = baseForm ? baseForm.abilities : [];

  if (s.isMega && baseForm) {
    if (baseForm.name === 'Palafin (Zero Form)') abs = ['Zero to Hero'];
    else if (baseForm.name === 'Aegislash (Shield)') abs = ['Stance Change'];
    else if (baseForm.megaOptions) {
      const mOpt = baseForm.megaOptions.find(m => m.stone === s.item);
      if (mOpt && mOpt.ability) abs = [mOpt.ability];
    } else if (baseForm.mega && baseForm.mega.ability) {
      abs = [baseForm.mega.ability];
    }
    if (!abs.includes(s.ability) && abs.length > 0) s.ability = abs[0];
  }

  $('#ability-select').innerHTML = abs.map(a=>`<option value="${a}" ${s.ability===a?'selected':''}>${a}</option>`).join('');
  const abDescBox = document.getElementById('ability-desc-text') || document.getElementById('ability-desc');
  if (abDescBox) {
    if (s.ability) {
      const abData = state.data.abilities.find(a => a.name === s.ability);
      abDescBox.textContent = abData && abData.desc ? abData.desc : 'No description available.';
    } else {
      abDescBox.textContent = 'Select an ability to see its effect.';
    }
  }

  $('#nature-select').innerHTML = state.data.natures.map(n=>`<option value="${n.name}" ${s.nature===n.name?'selected':''}>${n.name} ${n.up?`(+${n.up} -${n.down})`:''}</option>`).join('');
}

function renderMoves() {
  const s = getSlot();
  const form = getActiveForm();
  if(!s || !form) { document.getElementById('moves-grid').innerHTML=''; return; }

  const pokemonEntry = state.data.pokemon.find(p=>p.name===s.pokemon);
  const learnset = form.learnset || (pokemonEntry ? pokemonEntry.learnset : []) || [];

  let validMoves = state.data.moves;
  if (learnset.length > 0) {
    validMoves = validMoves.filter(m => {
      const moveId = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return learnset.includes(moveId);
    });
  }

  const movesByType = [...new Set(validMoves.map(m => m.type))]
    .sort()
    .map(type => ({ type, moves: validMoves.filter(m => m.type === type).sort((a,b) => a.name.localeCompare(b.name)) }));

  const catClass = category => {
    if(category === 'Physical') return 'cat-physical';
    if(category === 'Special') return 'cat-special';
    return 'cat-status';
  };

  
  const renderMoveButton = (moveIdx, choiceIdx, currentValue) => {
    const cvLower = (currentValue || '').toLowerCase();
    const selectedMove = validMoves.find(m => (m.name || '').toLowerCase() === cvLower);
    const title = selectedMove ? selectedMove.name : 'Select Move';

    const type = selectedMove ? selectedMove.type : null;
    const category = selectedMove ? selectedMove.category : null;
    const power = selectedMove && selectedMove.power ? selectedMove.power : '—';
    const accuracy = selectedMove && selectedMove.accuracy ? selectedMove.accuracy : '—';
    const contact = selectedMove ? (selectedMove.contact ? 'Contact' : 'No Contact') : '';
    const desc = selectedMove ? (selectedMove.desc || 'No description.') : 'Choose a move from the Pokémon Champions learnset.';

    return `<button type="button" class="move-picker-btn ${selectedMove ? 'has-value' : ''}" onclick="openMovePicker(${moveIdx}, ${choiceIdx})">
      <div class="move-picker-top">
        <span class="move-picker-name">${title}</span>
        ${type ? `<span class="tc" style="background:${TYPE_COLORS[type] || '#64748b'}">${type}</span>` : `<span class="move-picker-placeholder">Pick</span>`}
      </div>
      <div class="move-picker-meta">
        ${category ? `<span class="cat-badge ${catClass(category)}">${category}</span>` : ''}
        ${selectedMove ? `<span class="move-mini-stat">BP ${power}</span><span class="move-mini-stat">ACC ${accuracy}</span><span class="move-mini-stat">${contact}</span>` : ''}
      </div>
      <div class="move-picker-desc">${desc}</div>
    </button>`;
  };

  document.getElementById('moves-grid').innerHTML = [1,2,3,4].map(moveIdx => `
    <div class="move-slot-card">
      <div class="move-slot-header">Move ${moveIdx}</div>
      <div class="move-choice-stack">
        ${['A','B'].map((choice, i) => {
          const v = s.moves[moveIdx-1][i];
          return `<div class="move-choice-row">
            <div class="move-choice-label">${choice}</div>
            ${renderMoveButton(moveIdx - 1, i, v)}
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');

  let picker = document.getElementById('move-picker-popover');
  if(!picker) {
    picker = document.createElement('div');
    picker.id = 'move-picker-popover';
    picker.className = 'move-picker-popover hidden';
    document.body.appendChild(picker);
  }

  window.__movePickerData = { validMoves, movesByType };
}

window.openMovePicker = (moveIdx, choiceIdx) => {
  const picker = document.getElementById('move-picker-popover');
  const { movesByType } = window.__movePickerData || { movesByType: [] };
  if(!picker) return;

  const catClass = category => {
    if(category === 'Physical') return 'cat-physical';
    if(category === 'Special') return 'cat-special';
    return 'cat-status';
  };

  picker.innerHTML = `
    <div class="move-picker-dialog">
      <div class="move-picker-toolbar">
        <input id="move-picker-search" class="move-picker-search" placeholder="Search move..." />
        <button type="button" class="move-picker-close" onclick="closeMovePicker()">✕</button>
      </div>
      <div id="move-picker-results" class="move-picker-results"></div>
    </div>
  `;

  const renderResults = (query = '') => {
    const q = query.trim().toLowerCase();
    document.getElementById('move-picker-results').innerHTML = movesByType.map(group => {
      const filtered = group.moves.filter(m => !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || group.type.toLowerCase().includes(q));
      if(!filtered.length) return '';
      return `
        <div class="move-type-group">
          <div class="move-type-header">
            <span class="tc" style="background:${TYPE_COLORS[group.type] || '#64748b'}">${group.type}</span>
            <span class="move-type-count">${filtered.length} moves</span>
          </div>
          <div class="move-option-list">
            ${filtered.map(m => {
              const power = m.power ? m.power : '—';
              const accuracy = m.accuracy ? m.accuracy : '—';
              return `
                <button type="button" class="move-option" data-move-name="${m.name.replace(/"/g, '&quot;')}">
                  <div class="move-option-main">
                    <div class="move-option-name-row">
                      <span class="move-option-name">${m.name}</span>
                      <span class="cat-badge ${catClass(m.category)}">${m.category}</span>
                    </div>
                    <div class="move-option-stats">
                      <span class="move-mini-stat">BP ${power}</span>
                      <span class="move-mini-stat">ACC ${accuracy}</span>
                      <span class="move-mini-stat">${m.contact ? 'Contact' : 'No Contact'}</span>
                    </div>
                  </div>
                  <div class="move-option-desc">${m.desc || 'No description.'}</div>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('') || `<div class="move-empty-state">No moves found.</div>`;
  };

  const bindMoveOptionEvents = () => {
    document.querySelectorAll('.move-option').forEach(btn => {
      // remove old listeners if any (by replacing node, or just add since we rebuild HTML)
      btn.addEventListener('click', async () => {
        const moveName = btn.getAttribute('data-move-name').replace(/&quot;/g, '"');
        const s = getSlot();
        if (s) {
          if (!s.moves) s.moves = [['',''],['',''],['',''],['','']];
          s.moves[moveIdx][choiceIdx] = moveName;
          await persist();
        }
        closeMovePicker();
        renderMoves();
      });
    });
  };

  picker.classList.remove('hidden');
  renderResults();
  bindMoveOptionEvents();

  const search = document.getElementById('move-picker-search');
  search.addEventListener('input', e => {
    renderResults(e.target.value);
    bindMoveOptionEvents();
  });
  search.focus();
};

window.closeMovePicker = () => {
  const picker = document.getElementById('move-picker-popover');
  if(picker) picker.classList.add('hidden');
};

window.selectMoveFromPicker = async (moveIdx, choiceIdx, moveName) => {
  try {
    const s = getSlot();
    if (s) {
      if (!s.moves) s.moves = [['',''],['',''],['',''],['','']];
      s.moves[moveIdx][choiceIdx] = moveName;

      // Update stats and recalculate SP if necessary (though moves rarely affect it unless it triggers a sync)
      await persist();
    }
    closeMovePicker();
    renderMoves();
    // Anche se re-renderizza renderMoves, la griglia potrebbe aver bisogno di essere forzata
    console.log("Move updated successfully", moveIdx, choiceIdx, moveName);
  } catch(e) {
    console.error("Error setting move:", e);
  }
};

function renderStats() {
  const s = getSlot(); const f = getActiveForm(); const g = $('#stats-grid');
  if(!s||!f) { g.innerHTML=''; $('#sp-budget').textContent = 'SP: 0/66 (Max 32 per stat)'; return; }
  const nat = state.data.natures.find(n=>n.name===s.nature) || {};

  const totalSp = Object.values(s.sp).reduce((a,b)=>a+b,0);
  $('#sp-budget').textContent = `SP: ${totalSp}/${MAX_TOTAL_SP} (Max ${MAX_STAT_SP} per stat)`;

  g.innerHTML = STAT_ORDER.map(st => {
    const base = f.baseStats[st]; const sp = s.sp[st];
    let statVal = 0;
    if(st === 'HP') {
        statVal = base + sp;
    } else {
        let mod = 1;
        if(nat.up === st) mod = 1.1;
        if(nat.down === st) mod = 0.9;
        statVal = Math.floor((base + sp) * mod);
    }
    let color = pctToColor(base/250);
        let modClass = '';
    if(st !== 'HP') {
        if(nat.up === st) modClass = 'stat-up';
        if(nat.down === st) modClass = 'stat-down';
    }
    return `<div class="stat-card">
      <div class="stat-row"><b style="font-size:14px;color:#94a3b8;">${st}</b> <span id="stat-val-${st}" class="${modClass}" style="font-size:22px;font-weight:900;">${statVal}</span></div>
      <div class="stat-bar" style="margin:4px 0;"><div class="stat-fill" style="width:${Math.min(100, (base/250)*100)}%; background:${color}"></div></div>
      <div class="stat-row hint" style="margin-bottom:4px; font-size:11px; color:#64748b;"><span>Base ${base}</span> <span id="stat-sp-${st}" style="color:#e2e8f0; font-weight:700;">SP ${sp}</span></div>
      <div style="display:flex; align-items:center; gap:12px; margin-top:4px;">
        <input id="stat-num-${st}" type="number" min="0" max="32" value="${sp}" style="width:48px; height:28px;" oninput="updateSpInput('${st}', this.value)" />
        <input id="stat-range-${st}" type="range" min="0" max="32" step="1" value="${sp}" oninput="updateSpInput('${st}', this.value)" />
      </div>
    </div>`;
  }).join('');
}

function updateStatsDOM() {
  const s = getSlot(); const f = getActiveForm();
  if(!s||!f) return;
  const nat = state.data.natures.find(n=>n.name===s.nature) || {};
  const totalSp = Object.values(s.sp).reduce((a,b)=>a+b,0);
  $('#sp-budget').textContent = `SP: ${totalSp}/${MAX_TOTAL_SP} (Max ${MAX_STAT_SP} per stat)`;

  STAT_ORDER.forEach(st => {
    const base = f.baseStats[st]; const sp = s.sp[st];
    let statVal = 0;
    if(st === 'HP') {
        statVal = base + sp;
    } else {
        let mod = 1;
        if(nat.up === st) mod = 1.1;
        if(nat.down === st) mod = 0.9;
        statVal = Math.floor((base + sp) * mod);
    }

    const valEl = document.getElementById(`stat-val-${st}`);
    if(valEl) {
      valEl.textContent = statVal;
      valEl.className = '';
      if(st !== 'HP') {
        if(nat.up === st) valEl.classList.add('stat-up');
        if(nat.down === st) valEl.classList.add('stat-down');
      }
    }
    const spEl = document.getElementById(`stat-sp-${st}`);
    if(spEl) spEl.textContent = `SP ${sp}`;

    const numEl = document.getElementById(`stat-num-${st}`);
    if(numEl && parseInt(numEl.value) !== sp) numEl.value = sp;
    const rangeEl = document.getElementById(`stat-range-${st}`);
    if(rangeEl && parseInt(rangeEl.value) !== sp) rangeEl.value = sp;
  });
}

window.updateSpInput = async (st, val) => {
  const s = getSlot(); if(!s) return;
  let newSp = parseInt(val, 10) || 0;
  if (newSp < 0) newSp = 0;
  if (newSp > MAX_STAT_SP) newSp = MAX_STAT_SP;

  const otherSpTot = Object.values(s.sp).reduce((a,b)=>a+b,0) - s.sp[st];
  if (otherSpTot + newSp > MAX_TOTAL_SP) {
      newSp = MAX_TOTAL_SP - otherSpTot;
  }

  s.sp[st] = newSp; 
  updateStatsDOM();
  persist(); // Save without blocking the UI drag
};

function pctToColor(pct) {
  if (pct < 0.3) return '#e03e3e'; if (pct < 0.5) return '#e08f3e'; if (pct < 0.7) return '#dce03e'; return '#4be03e';
}

window.addEventListener('DOMContentLoaded', init);


window.updateMove = async (moveIdx, choiceIdx, val) => {
  const s = getSlot();
  if(!s) return;

  if (!s.moves) s.moves = [['',''],['',''],['',''],['','']];
  s.moves[moveIdx][choiceIdx] = val;

  // Also we should check if they selected a move and then immediately save
  persist();
};

const TYPE_CHART = {
  Normal: { weak: ['Fighting'], resist: [], immune: ['Ghost'] },
  Fire: { weak: ['Water', 'Ground', 'Rock'], resist: ['Fire', 'Grass', 'Ice', 'Bug', 'Steel', 'Fairy'], immune: [] },
  Water: { weak: ['Electric', 'Grass'], resist: ['Fire', 'Water', 'Ice', 'Steel'], immune: [] },
  Electric: { weak: ['Ground'], resist: ['Electric', 'Flying', 'Steel'], immune: [] },
  Grass: { weak: ['Fire', 'Ice', 'Poison', 'Flying', 'Bug'], resist: ['Water', 'Electric', 'Grass', 'Ground'], immune: [] },
  Ice: { weak: ['Fire', 'Fighting', 'Rock', 'Steel'], resist: ['Ice'], immune: [] },
  Fighting: { weak: ['Flying', 'Psychic', 'Fairy'], resist: ['Bug', 'Rock', 'Dark'], immune: [] },
  Poison: { weak: ['Ground', 'Psychic'], resist: ['Grass', 'Fighting', 'Poison', 'Bug', 'Fairy'], immune: [] },
  Ground: { weak: ['Water', 'Grass', 'Ice'], resist: ['Poison', 'Rock'], immune: ['Electric'] },
  Flying: { weak: ['Electric', 'Ice', 'Rock'], resist: ['Grass', 'Fighting', 'Bug'], immune: ['Ground'] },
  Psychic: { weak: ['Bug', 'Ghost', 'Dark'], resist: ['Fighting', 'Psychic'], immune: [] },
  Bug: { weak: ['Fire', 'Flying', 'Rock'], resist: ['Grass', 'Fighting', 'Ground'], immune: [] },
  Rock: { weak: ['Water', 'Grass', 'Fighting', 'Ground', 'Steel'], resist: ['Normal', 'Fire', 'Poison', 'Flying'], immune: [] },
  Ghost: { weak: ['Ghost', 'Dark'], resist: ['Poison', 'Bug'], immune: ['Normal', 'Fighting'] },
  Dragon: { weak: ['Ice', 'Dragon', 'Fairy'], resist: ['Fire', 'Water', 'Electric', 'Grass'], immune: [] },
  Dark: { weak: ['Fighting', 'Bug', 'Fairy'], resist: ['Ghost', 'Dark'], immune: ['Psychic'] },
  Steel: { weak: ['Fire', 'Fighting', 'Ground'], resist: ['Normal', 'Grass', 'Ice', 'Flying', 'Psychic', 'Bug', 'Rock', 'Dragon', 'Steel', 'Fairy'], immune: ['Poison'] },
  Fairy: { weak: ['Poison', 'Steel'], resist: ['Fighting', 'Bug', 'Dark'], immune: ['Dragon'] }
};



function calculateDefensiveProfile(types, ability) {
  let profile = {};
  Object.keys(TYPE_CHART).forEach(t => profile[t] = 1);

  types.forEach(t => {
    if(!TYPE_CHART[t]) return;
    TYPE_CHART[t].weak.forEach(w => profile[w] *= 2);
    TYPE_CHART[t].resist.forEach(r => profile[r] /= 2);
    TYPE_CHART[t].immune.forEach(i => profile[i] = 0);
  });

  // Ability immunities/resistances
  if (ability === 'Levitate') profile['Ground'] = 0;
  if (ability === 'Water Absorb' || ability === 'Storm Drain' || ability === 'Dry Skin') profile['Water'] = 0;
  if (ability === 'Volt Absorb' || ability === 'Lightning Rod' || ability === 'Motor Drive') profile['Electric'] = 0;
  if (ability === 'Flash Fire' || ability === 'Well-Baked Body') profile['Fire'] = 0;
  if (ability === 'Sap Sipper') profile['Grass'] = 0;
  if (ability === 'Earth Eater') profile['Ground'] = 0;
  if (ability === 'Thick Fat') { profile['Fire'] /= 2; profile['Ice'] /= 2; }
  if (ability === 'Purifying Salt') profile['Ghost'] /= 2; 
  if (ability === 'Heatproof' || ability === 'Water Bubble') profile['Fire'] /= 2; 

  const grouped = { '4x':[], '2x':[], '1x':[], '0.5x':[], '0.25x':[], '0x':[] };

  Object.entries(profile).forEach(([type, val]) => {
    if (val === 4) grouped['4x'].push(type);
    else if (val === 2) grouped['2x'].push(type);
    else if (val === 1) grouped['1x'].push(type);
    else if (val === 0.5) grouped['0.5x'].push(type);
    else if (val === 0.25) grouped['0.25x'].push(type);
    else if (val === 0) grouped['0x'].push(type);
  });

  return grouped;
}

function renderDefensiveProfile() {
  const container = document.getElementById('defensive-profile');
  if(!container) return;
  const s = getSlot(); const form = getActiveForm();
  if(!s || !form) { container.innerHTML = '<span class="hint">No Pokémon selected</span>'; return; }

  const profile = calculateDefensiveProfile(form.types, s.ability);

  // Usa lo stesso esatto span del renderTypeBadge in alto
  const createBadgeList = (types) => types.map(t => `<span class="tc" style="background:${TYPE_COLORS[t]}; display:inline-block; padding:2px 8px; border-radius:12px; color:white; font-size:12px; font-weight:bold; margin-right:4px; margin-bottom:4px;">${t}</span>`).join('');

  let html = `<div style="display:flex; flex-wrap:wrap; gap:16px;">`;

  if (profile['4x'].length > 0) html += `<div style="flex:1; min-width:120px;"><div style="font-size:12px; font-weight:bold; color:#ff4444; margin-bottom:4px; text-transform:uppercase;">Extremely Weak (4x)</div><div>${createBadgeList(profile['4x'])}</div></div>`;
  if (profile['2x'].length > 0) html += `<div style="flex:1; min-width:120px;"><div style="font-size:12px; font-weight:bold; color:#ff8888; margin-bottom:4px; text-transform:uppercase;">Weak (2x)</div><div>${createBadgeList(profile['2x'])}</div></div>`;
  if (profile['0x'].length > 0) html += `<div style="flex:1; min-width:120px;"><div style="font-size:12px; font-weight:bold; color:#aaaaaa; margin-bottom:4px; text-transform:uppercase;">Immune (0x)</div><div>${createBadgeList(profile['0x'])}</div></div>`;
  if (profile['0.5x'].length > 0) html += `<div style="flex:1; min-width:120px;"><div style="font-size:12px; font-weight:bold; color:#88ff88; margin-bottom:4px; text-transform:uppercase;">Resists (0.5x)</div><div>${createBadgeList(profile['0.5x'])}</div></div>`;
  if (profile['0.25x'].length > 0) html += `<div style="flex:1; min-width:120px;"><div style="font-size:12px; font-weight:bold; color:#44ff44; margin-bottom:4px; text-transform:uppercase;">Highly Resists (0.25x)</div><div>${createBadgeList(profile['0.25x'])}</div></div>`;
  if (profile['1x'].length > 0) html += `<div style="flex:1; min-width:120px;"><div style="font-size:12px; font-weight:bold; color:#cccccc; margin-bottom:4px; text-transform:uppercase;">Neutral (1x)</div><div>${createBadgeList(profile['1x'])}</div></div>`;

  html += `</div>`;
  container.innerHTML = html;
}


document.addEventListener('DOMContentLoaded', init);
