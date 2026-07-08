
/* Jamylle's Castle v0.5.3 — partida online jogável inicial */
(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyDw5H48xXyg6_JWSOIXJYNammCRE5AGR7s",
    authDomain: "jamylles-castle.firebaseapp.com",
    projectId: "jamylles-castle",
    storageBucket: "jamylles-castle.firebasestorage.app",
    messagingSenderId: "615205626241",
    appId: "1:615205626241:web:4a23ff49f6f46d2f264880",
    measurementId: "G-K70PSLHEE2"
  };

  const CARD_VALUES = ['3','4','5','6','7','8','9','10','J','Q','K','A','2'];
  const SUITS = [
    { id:'filtro', label:'Filtro', symbol:'⚱️' },
    { id:'chinelo', label:'Chinelo', symbol:'🩴' },
    { id:'cadeira', label:'Cadeira', symbol:'🪑' },
    { id:'papagaio', label:'Papagaio', symbol:'🦜' }
  ];
  const JOKERS = [
    { valueStr:'★', suitId:'coringa', power:13, label:'Caramelo', symbol:'🐕' },
    { valueStr:'★', suitId:'coringa', power:13, label:'João-de-barro', symbol:'🐦' }
  ];

  let app, auth, db, currentUser;
  let currentRoomCode = '', currentRoom = null, currentPlayers = [], currentHand = [];
  let selectedCardIds = new Set(), onlineMode = false, processingActions = false, botBusy = false;
  let lastSfxTurnCounter = -1, lastSfxPhase = '';
  let roomUnsub, playersUnsub, handUnsub, actionsUnsub, heartbeatTimer, botTimer, transitionTimer;
  const dom = {};

  function qs(s){ return document.querySelector(s); }
  function collectDom(){
    dom.modal = qs('#onlineModal'); dom.homeLobbyPanel = qs('#homeLobbyPanel'); dom.status = qs('#onlineStatus');
    dom.roomCode = qs('#onlineRoomCode'); dom.password = qs('#onlineRoomPassword');
    dom.lobby = qs('#onlineLobby'); dom.lobbyTitle = qs('#onlineLobbyTitle');
    dom.playersList = qs('#onlinePlayersList'); dom.bridgeNote = qs('#onlineBridgeNote'); dom.readyButton = qs('#readyButton'); dom.startButton = qs('#startOnlineButton');
    dom.playerName = qs('#playerName'); dom.onlinePlayerName = qs('#onlinePlayerName');
    dom.menuRoomName = qs('#roomName'); dom.menuPassword = qs('#roomPassword');
    dom.deckCount = qs('#deckCount'); dom.botCount = qs('#botCount'); dom.includeJokers = qs('#includeJokers');
    dom.allowObservers = qs('#allowObservers'); dom.observerVoicePolicy = qs('#observerVoicePolicy');
    dom.menuScreen = qs('#menuScreen'); dom.gameScreen = qs('#gameScreen'); dom.roomInfo = qs('#roomInfo');
    dom.turnInfo = qs('#turnInfo'); dom.ruleHint = qs('#ruleHint'); dom.playersSummary = qs('#playersSummary');
    dom.tableCards = qs('#tableCards'); dom.roundHistory = qs('#roundHistory'); dom.playerHand = qs('#playerHand');
    dom.selectionMessage = qs('#selectionMessage'); dom.playButton = qs('#playButton'); dom.passButton = qs('#passButton');
    dom.rematchButton = qs('#rematchButton');
  }

  function setStatus(message, type=''){
    if(!dom.status) return;
    dom.status.textContent = message;
    dom.status.classList.toggle('error', type === 'error');
    dom.status.classList.toggle('ok', type === 'ok');
  }
  function menuAudio(){
    return document.querySelector('#menuThemeAudio');
  }
  function stopMenuMusic(){
    const audio = menuAudio();
    if(!audio) return;
    audio.pause();
  }
  function requestAutoVoice(reason='room-joined'){
    if(!currentRoomCode) return;
    window.dispatchEvent(new CustomEvent('jc:auto-voice', {
      detail: { roomCode: currentRoomCode, reason }
    }));
    window.setTimeout(() => {
      try{ window.jcVoice?.join?.({ auto: true, reason }); }catch(error){}
    }, 260);
  }
  function sfx(name, ...args){
    if(document.querySelector('#soundEnabled')?.checked === false) return;
    try{
      window.jcSfx?.configure?.(true);
      window.jcSfx?.[name]?.(...args);
    }catch(error){}
  }
  function normalizeRoomCode(v){ return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]/g,'').toUpperCase().slice(0,18) || 'CASTELO'; }
  function getPlayerName(){
    const n = (String(dom.onlinePlayerName?.value||'').trim() || String(dom.playerName?.value||'').trim() || 'Jogador').slice(0,16);
    if(dom.playerName) dom.playerName.value = n;
    if(dom.onlinePlayerName) dom.onlinePlayerName.value = n;
    return n;
  }
  function simpleHash(text){ let h=0; for(const ch of String(text||'')){ h=((h<<5)-h)+ch.charCodeAt(0); h|=0; } return String(h); }
  function ts(){ return firebase.firestore.FieldValue.serverTimestamp(); }
  function roomRef(c){ return db.collection('rooms').doc(c); }
  function playerRef(c,u){ return roomRef(c).collection('players').doc(u); }
  function handRef(c,u){ return roomRef(c).collection('hands').doc(u); }
  function actionsRef(c){ return roomRef(c).collection('actions'); }
  function isHost(){ return Boolean(currentUser && currentRoom && currentUser.uid === currentRoom.hostUid); }
  function clone(v){ return JSON.parse(JSON.stringify(v || {})); }
  function esc(v){ return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }

  function cardPower(v){ return v === '★' ? 13 : CARD_VALUES.indexOf(v); }
  function createDeck(deckCount=1, includeJokers=false){
    const cards=[];
    for(let d=0; d<deckCount; d++){
      for(const s of SUITS) for(const v of CARD_VALUES) cards.push({id:`${d}-${v}-${s.id}-${Math.random().toString(36).slice(2,7)}`, deckIndex:d, valueStr:v, suitId:s.id, suitName:s.label, suitSymbol:s.symbol, power:cardPower(v), isJoker:false});
      if(includeJokers) for(const j of JOKERS) cards.push({id:`${d}-joker-${j.label}-${Math.random().toString(36).slice(2,7)}`, deckIndex:d, valueStr:j.valueStr, suitId:j.suitId, suitName:j.label, suitSymbol:j.symbol, power:j.power, isJoker:true});
    }
    return cards;
  }
  function shuffle(a){ const x=[...a]; for(let i=x.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]];} return x; }
  function sortCards(a){ return [...a].sort((x,y)=>Number(x.power)-Number(y.power)||String(x.suitId).localeCompare(String(y.suitId))); }
  function sameValue(a){ return Boolean(a.length) && a.every(c=>Number(c.power)===Number(a[0].power)); }
  function desc(combo){ if(!combo) return 'Mesa livre'; const label=combo.cards?.[0]?.valueStr||'?'; return `${combo.count} ${combo.count>1?'cartas':'carta'} de ${label}`; }
  function canPlay(sel, table){ if(!sel.length || !sameValue(sel)) return false; if(!table) return true; return sel.length===table.count && Number(sel[0].power)>Number(table.power); }
  function isBreaker(combo){ return combo && Number(combo.power) >= cardPower('2'); }
  function invalid(sel, table){ if(!sel.length) return 'Selecione uma ou mais cartas.'; if(!sameValue(sel)) return 'A jogada precisa ter cartas do mesmo valor.'; if(!table) return ''; if(sel.length!==table.count) return `Você precisa jogar exatamente ${table.count} carta(s).`; if(Number(sel[0].power)<=Number(table.power)) return 'A carta precisa ser maior que a jogada da mesa.'; return ''; }
  function rankName(i,total){ if(i===0)return'Majestade'; if(i===1)return'Regente'; if(i===total-1)return'Aldeão'; if(i===total-2&&total>=4)return'Plebeu'; return'Cortesão'; }

  async function initFirebase(){
    collectDom();
    if(!window.firebase){ setStatus('Firebase não carregou. Confira sua internet e publique em HTTPS.', 'error'); return false; }
    try{
      app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
      auth = firebase.auth(); db = firebase.firestore();
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const credential = auth.currentUser ? {user:auth.currentUser} : await auth.signInAnonymously();
      currentUser = credential.user || auth.currentUser;
      setStatus('Firebase conectado. Pronto para criar ou entrar em uma sala.', 'ok');
      return true;
    }catch(e){ console.error(e); setStatus(e?.code==='auth/operation-not-allowed'?'Ative Authentication > Anonymous no Firebase Console.':`Falha ao conectar: ${e?.message||e}`, 'error'); return false; }
  }
  async function ensureReady(){ return (db && auth && currentUser) || await initFirebase(); }

  function openOnlineModal(){
    collectDom(); if(dom.homeLobbyPanel) dom.homeLobbyPanel.hidden=false;
    if(dom.onlinePlayerName && !dom.onlinePlayerName.value) dom.onlinePlayerName.value=String(dom.playerName?.value||'').trim()||'Jogador';
    if(dom.roomCode && !dom.roomCode.value) dom.roomCode.value=normalizeRoomCode(dom.menuRoomName?.value||'CASTELO');
    if(dom.password && !dom.password.value && dom.menuPassword?.value) dom.password.value=dom.menuPassword.value;
    initFirebase();
  }
  function closeOnlineModal(){ if(dom.modal) dom.modal.hidden=true; }
  function timestampToMs(value){
    if(!value) return 0;
    if(typeof value.toMillis === 'function') return value.toMillis();
    if(typeof value.seconds === 'number') return value.seconds * 1000;
    return 0;
  }
  function canRecycleRoom(room){
    const phase = room?.phase || 'lobby';
    const ageMs = Date.now() - timestampToMs(room?.updatedAt || room?.createdAt);
    // v0.7.5: sala finalizada ou abandonada por 30 minutos pode ser reaproveitada.
    return phase === 'finished' || ageMs > 1000 * 60 * 30;
  }
  async function purgeRoomCollection(collectionRef){
    const snapshot = await collectionRef.get();
    if(snapshot.empty) return;
    let batch = db.batch();
    let count = 0;
    for(const doc of snapshot.docs){
      batch.delete(doc.ref);
      count += 1;
      if(count % 400 === 0){
        await batch.commit();
        batch = db.batch();
      }
    }
    if(count % 400 !== 0) await batch.commit();
  }
  async function clearRoomData(code){
    const ref = roomRef(code);
    await purgeRoomCollection(ref.collection('actions')).catch(console.warn);
    await purgeRoomCollection(ref.collection('hands')).catch(console.warn);
    await purgeRoomCollection(ref.collection('players')).catch(console.warn);
    await purgeRoomCollection(ref.collection('voiceParticipants')).catch(console.warn);
    await purgeRoomCollection(ref.collection('voiceSignals')).catch(console.warn);
    await ref.delete().catch(console.warn);
  }

  async function createRoom(){
    if(dom.homeLobbyPanel) dom.homeLobbyPanel.hidden=false; if(!await ensureReady()) return;
    const code=normalizeRoomCode(dom.menuRoomName?.value||dom.roomCode?.value||'CASTELO'); if(dom.roomCode) dom.roomCode.value=code;
    const password=String(dom.menuPassword?.value||dom.password?.value||'').trim();
    const snap=await roomRef(code).get();
    if(snap.exists){
      const existingRoom = snap.data() || {};
      if(canRecycleRoom(existingRoom)){
        await clearRoomData(code);
        setStatus(`A antiga sala ${code} foi encerrada e será reutilizada.`, 'ok');
      }else{
        setStatus(`A sala ${code} já existe e ainda está ativa. Escolha outro nome ou entre nela.`, 'error');
        return;
      }
    }
    await roomRef(code).set({
      code, title:code, phase:'lobby', hostUid:currentUser.uid, hostName:getPlayerName(),
      passwordProtected:Boolean(password), passwordHash:password?simpleHash(password):'',
      deckCount:Number(dom.deckCount?.value||1), botCount:Number(dom.botCount?.value||0), includeJokers:Boolean(dom.includeJokers?.checked),
      allowObservers:Boolean(dom.allowObservers?.checked), observerVoicePolicy:dom.observerVoicePolicy?.value||'listen-only',
      createdAt:ts(), updatedAt:ts(), sessionId:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`, gameStateVersion:0
    });
    await playerRef(code,currentUser.uid).set({uid:currentUser.uid,name:getPlayerName(),isHost:true,isBot:false,ready:true,role:'host',connected:true,cardCount:0,joinedAt:ts(),lastSeen:ts()},{merge:true});
    attachRoom(code); sfx('ui'); requestAutoVoice('room-created'); setStatus(`Sala ${code} criada. Voz ativando automaticamente. Compartilhe o código com os jogadores.`, 'ok');
  }

  async function joinRoom(){
    if(dom.modal) dom.modal.hidden=false; if(!await ensureReady()) return;
    const code=normalizeRoomCode(dom.menuRoomName?.value||dom.roomCode?.value||''); if(dom.roomCode) dom.roomCode.value=code;
    const snap=await roomRef(code).get();
    if(!snap.exists){ setStatus(`Não encontrei a sala ${code}. Confira o código ou peça ao anfitrião para criar.`, 'error'); return; }
    const room=snap.data(); const password=String(dom.menuPassword?.value||dom.password?.value||'').trim();
    if(room.passwordProtected && simpleHash(password)!==room.passwordHash){ setStatus('Senha incorreta para esta sala.', 'error'); return; }
    if(room.phase!=='lobby'){ setStatus('Esta sala já iniciou. Entrada em andamento virá depois.', 'error'); return; }
    await playerRef(code,currentUser.uid).set({uid:currentUser.uid,name:getPlayerName(),isHost:currentUser.uid===room.hostUid,isBot:false,ready:true,role:currentUser.uid===room.hostUid?'host':'player',connected:true,cardCount:0,joinedAt:ts(),lastSeen:ts()},{merge:true});
    await roomRef(code).set({updatedAt:ts()},{merge:true});
    currentRoom = {...room, updatedAt:ts()};
    attachRoom(code); sfx('ui'); requestAutoVoice('room-joined');
    setStatus(`Você entrou na sala ${code}. Você já está na mesa; aguarde o anfitrião iniciar.`, 'ok');
    if(currentUser.uid !== room.hostUid){
      window.setTimeout(()=>enterOnlineTable(true), 120);
    }else{
      window.setTimeout(()=>dom.homeLobbyPanel?.scrollIntoView?.({block:'center'}),120);
    }
  }

  function attachRoom(code){
    detachRoom(); currentRoomCode=code;
    if(dom.homeLobbyPanel) dom.homeLobbyPanel.hidden=false; if(dom.lobby) dom.lobby.hidden=false; if(dom.bridgeNote) dom.bridgeNote.hidden=true; if(dom.lobbyTitle) dom.lobbyTitle.textContent=`Sala ${code}`;
    roomUnsub=roomRef(code).onSnapshot(s=>{
      currentRoom=s.exists?s.data():null;
      if(!currentRoom){setStatus('A sala foi encerrada.','error');detachRoom();renderLobby();return;}
      if(shouldEnterGame(currentRoom)){
        forceEnterIfStarted('room-snapshot');
        renderOnlineGame();
        if(isHost()){
          setupHostActionListener();
          scheduleBotIfNeeded('room-snapshot');
        }
        return;
      }
      renderLobby(); renderOnlineGame();
      if(isHost()) setupHostActionListener();
      if(isHost()) scheduleBotIfNeeded('room-lobby');
    }, e=>setStatus(`Erro ao ler a sala: ${e.message}`,'error'));
    playersUnsub=roomRef(code).collection('players').orderBy('joinedAt','asc').onSnapshot(s=>{
      currentPlayers=s.docs.map(d=>({id:d.id,...d.data()}));
      const me=currentPlayers.find(p=>p.uid===currentUser?.uid);
      if(me?.gameStarted && !onlineMode){ forceSyncStartedRoom('player-start-signal'); }
      if(me && !me.isHost && !me.isBot && currentRoom?.phase==='lobby' && me.ready!==true){
        playerRef(code,currentUser.uid).set({ready:true,lastSeen:ts()},{merge:true}).catch(console.warn);
      }
      if(currentRoom && shouldEnterGame(currentRoom)){
        forceEnterIfStarted('players-snapshot');
        renderOnlineGame();
        if(isHost()) scheduleBotIfNeeded('players-snapshot');
        return;
      }
      renderLobby(); renderOnlineGame(); if(isHost()) scheduleBotIfNeeded('players-lobby');
    }, e=>setStatus(`Erro ao ler jogadores: ${e.message}`,'error'));
    handUnsub=handRef(code,currentUser.uid).onSnapshot(s=>{
      currentHand=s.exists?sortCards(s.data().cards||[]):[];
      if(s.exists && currentRoom && shouldEnterGame(currentRoom)) forceEnterIfStarted('hand-snapshot');
      renderOnlineGame();
      if(isHost()) scheduleBotIfNeeded('hand-snapshot');
    }, ()=>{});
    heartbeatTimer=window.setInterval(()=>{ if(currentRoomCode&&currentUser) playerRef(currentRoomCode,currentUser.uid).set({connected:true,lastSeen:ts()},{merge:true}).catch(console.warn); },15000);
    startTransitionWatcher();
  }
  function setupHostActionListener(){
    if(actionsUnsub||!currentRoomCode||!isHost()) return;
    // v0.7.5: sem orderBy no Firestore para não exigir índice composto.
    // A ordenação por createdAt acontece localmente no navegador do anfitrião.
    actionsUnsub=actionsRef(currentRoomCode).where('processed','==',false).onSnapshot(s=>{
      const pending=s.docs
        .map(d=>({id:d.id,...d.data()}))
        .sort((a,b)=>timestampToMs(a.createdAt)-timestampToMs(b.createdAt));
      processActionsAsHost(pending);
    }, e=>setStatus(`Erro nas ações: ${e.message}`,'error'));
  }
  function ensureOnlineTableVisible(){
    collectDom();
    const menu = dom.menuScreen || document.getElementById('menuScreen');
    const game = dom.gameScreen || document.getElementById('gameScreen');
    if(menu){
      menu.classList.remove('active');
      menu.setAttribute('aria-hidden','true');
      menu.style.display='none';
    }
    if(game){
      game.hidden=false;
      game.removeAttribute('aria-hidden');
      game.classList.add('active');
      game.style.display='grid';
    }
    document.body.classList.add('onlineGameActive');
    document.documentElement.classList.add('onlineGameActive');
    window.scrollTo?.(0,0);
  }

  async function forceSyncStartedRoom(source='sync'){
    if(!currentRoomCode) return false;
    try{
      const snap = await roomRef(currentRoomCode).get();
      if(!snap.exists) return false;
      const room = snap.data() || null;
      currentRoom = room;
      if(!shouldEnterGame(room)){
        if(onlineMode){ ensureOnlineTableVisible(); renderOnlineGame(); }
        return false;
      }
      if(!onlineMode) setStatus('Partida iniciada. Entrando na mesa...', 'ok');
      enterOnlineTable(true);
      return true;
    }catch(error){
      console.warn('Falha na sincronização direta da partida:', error);
      return false;
    }
  }

  function shouldEnterGame(room){
    return Boolean(room && (room.phase === 'playing' || room.phase === 'finished' || room.game?.phase === 'playing' || room.game?.phase === 'finished'));
  }
  async function forceEnterIfStarted(source='sync'){
    if(!currentRoomCode) return false;
    try{
      if(onlineMode){
        ensureOnlineTableVisible();
        renderOnlineGame();
        return true;
      }

      let room = currentRoom;
      if(!shouldEnterGame(room)){
        const snap = await roomRef(currentRoomCode).get();
        if(!snap.exists) return false;
        room = snap.data() || null;
        currentRoom = room;
      }
      if(!shouldEnterGame(room)) return false;
      setStatus('Partida iniciada. Entrando na mesa...', 'ok');
      enterOnlineTable(true);
      return true;
    }catch(error){
      console.warn('Falha ao forçar entrada na mesa:', error);
      // Último fallback: se a sala realmente começou, tentar sincronização direta.
      return forceSyncStartedRoom(source + '-fallback');
    }
  }
  function startTransitionWatcher(){
    window.clearInterval(transitionTimer);
    transitionTimer = window.setInterval(() => {
      if(!currentRoomCode) return;
      if(onlineMode) ensureOnlineTableVisible();
      // Leitura direta do documento da sala: evita depender só do snapshot em celulares/cache.
      forceSyncStartedRoom('poll-direct');
    }, 700);
  }
  function detachRoom(){
    if(roomUnsub)roomUnsub(); if(playersUnsub)playersUnsub(); if(handUnsub)handUnsub(); if(actionsUnsub)actionsUnsub();
    roomUnsub=playersUnsub=handUnsub=actionsUnsub=null; window.clearInterval(heartbeatTimer); window.clearInterval(transitionTimer); window.clearTimeout(botTimer);
  }

  function renderLobby(){
    if(!dom.playersList) return;
    if(!currentRoom||!currentRoomCode){if(dom.playersList)dom.playersList.innerHTML=''; if(dom.lobby)dom.lobby.hidden=true; if(dom.bridgeNote)dom.bridgeNote.hidden=false; return;}
    const botCount=Number(currentRoom.botCount||0);
    const humans=currentPlayers.filter(p=>!p.isBot);
    const guests=humans.filter(p=>p.uid!==currentRoom.hostUid);
    const pendingGuests=guests.filter(p=>!p.ready);
    const allGuestsReady=pendingGuests.length===0;
    const total=humans.length+(currentRoom.phase==='lobby'?botCount:0);
    const canStart=isHost()&&total>=3&&currentRoom.phase==='lobby'&&allGuestsReady;
    const me=currentPlayers.find(p=>p.uid===currentUser?.uid);
    if(dom.readyButton){
      dom.readyButton.textContent=me?.ready?'Pronto automático ✓':'Estou pronto';
      dom.readyButton.disabled=currentRoom.phase!=='lobby' || Boolean(me?.ready);
      dom.readyButton.classList.toggle('readyOn', Boolean(me?.ready));
      dom.readyButton.hidden = isHost();
    }
    if(dom.startButton){
      dom.startButton.disabled=!canStart;
      dom.startButton.textContent='Iniciar partida';
      dom.startButton.hidden = !isHost();
      dom.startButton.title = canStart ? 'Iniciar a partida para todos.' : (pendingGuests.length ? `Faltam ficar prontos: ${pendingGuests.map(p=>p.name||'Jogador').join(', ')}` : 'A sala precisa ter pelo menos 3 participantes somando jogadores e bots.');
    }
    if(dom.bridgeNote) dom.bridgeNote.hidden = true;
    const meta=`<div class="onlineRoomMeta"><span class="onlinePill">Baralhos: ${Number(currentRoom.deckCount||1)}</span><span class="onlinePill">Bots: ${Number(currentRoom.botCount||0)}</span><span class="onlinePill">${currentRoom.includeJokers?'Com coringas':'Sem coringas'}</span><span class="onlinePill">${currentRoom.passwordProtected?'Com senha':'Sem senha'}</span><span class="onlinePill">${currentRoom.phase==='playing'?'Em partida':currentRoom.phase==='finished'?'Encerrada':'Lobby'}</span></div>`;
    const readyGuide = isHost()
      ? `<div class="readyGuide ${pendingGuests.length?'waiting':'allReady'}"><strong>${pendingGuests.length?'Faltam ficar prontos:':'Convidados prontos'}</strong><span>${pendingGuests.length?pendingGuests.map(p=>esc(p.name||'Jogador')).join(', '):(guests.length?'Você já pode iniciar.':'Aguardando convidados ou usando bots.')}</span></div>`
      : `<div class="readyGuide ${me?.ready?'allReady':'waiting'}"><strong>${me?.ready?'Você já está pronto':'Entrada concluída'}</strong><span>${me?.ready?'Aguarde o anfitrião iniciar.':'O jogo tentará marcar você como pronto automaticamente.'}</span></div>`;
    dom.playersList.innerHTML=meta+readyGuide+currentPlayers.map(p=>{
      const isMe=p.uid===currentUser?.uid;
      const role=p.uid===currentRoom.hostUid?'Host':p.isBot?'Bot':'Convidado';
      const state=p.uid===currentRoom.hostUid?'Anfitrião':p.isBot?'Pronto':p.ready?'Pronto':'Falta pronto';
      const cls=p.uid===currentRoom.hostUid?'hostRow':p.isBot?'readyRow':p.ready?'readyRow':'waitingRow';
      return `<article class="onlinePlayerRow ${cls}"><strong>${esc(p.name||'Jogador')}${isMe?' <small>(você)</small>':''}</strong><span class="onlinePill ${p.uid===currentRoom.hostUid?'host':''}">${role}</span><span class="onlinePill ${p.ready||p.isBot||p.uid===currentRoom.hostUid?'ready':'waiting'}">${state}</span></article>`;
    }).join('');
    const hostStatus = pendingGuests.length
      ? `Aguardando pronto de: ${pendingGuests.map(p=>p.name||'Jogador').join(', ')}.`
      : `Todos os convidados estão prontos. Você pode iniciar.`;
    setStatus(currentRoom.phase==='playing'?`Partida online em andamento. Entrando na mesa...`:(isHost()?hostStatus:(me?.ready?`Você está pronto. Aguarde o anfitrião iniciar.`:`Você entrou na sala e já está pronto. Aguarde o anfitrião iniciar.`)),'ok');
  }
  async function toggleReady(){
    if(!currentRoomCode||!currentUser||currentRoom?.phase!=='lobby')return;
    if(isHost()) return;
    await playerRef(currentRoomCode,currentUser.uid).set({ready:true,lastSeen:ts()},{merge:true});
    setStatus('Você está pronto. Aguarde o anfitrião iniciar.','ok');
  }

  async function startOnline(){
    if(!currentRoomCode||!currentUser||!currentRoom)return;
    if(!isHost()){setStatus('Apenas o anfitrião pode iniciar a partida.','error');return;}
    const roomSnap = await roomRef(currentRoomCode).get();
    if(roomSnap.exists) currentRoom = {...currentRoom, ...roomSnap.data()};
    const playersNow = await fetchRoomPlayersDirect();
    const humans=playersNow.filter(p=>!p.isBot); const botCount=Number(currentRoom.botCount||0);
    const pending=humans.filter(p=>p.uid!==currentRoom.hostUid&&!p.ready);
    if(humans.length+botCount<3){setStatus('A partida precisa de pelo menos 3 participantes somando jogadores humanos e bots.','error');return;}
    if(pending.length){setStatus(`Ainda falta pronto de: ${pending.map(p=>p.name||'Jogador').join(', ')}.`, 'error');return;}
    stopMenuMusic(); sfx('draw'); await startGameAsHost(humans,botCount); setStatus('Partida iniciada. Cartas distribuídas.','ok'); enterOnlineTable(); window.setTimeout(scheduleBotIfNeeded, 450);
  }
  async function startGameAsHost(humans,botCount){
    const batch=db.batch(); const bots=[];
    for(let i=0;i<botCount;i++){ const bot={uid:`bot-${i+1}`,name:`Bot ${i+1}`,isHost:false,isBot:true,ready:true,role:'bot',connected:true,cardCount:0,joinedAt:ts(),lastSeen:ts()}; bots.push(bot); batch.set(playerRef(currentRoomCode,bot.uid),bot,{merge:true}); }
    const participants=[...humans.map(p=>({uid:p.uid,name:p.name||'Jogador',isBot:false})),...bots.map(b=>({uid:b.uid,name:b.name,isBot:true}))];
    const hands=new Map(participants.map(p=>[p.uid,[]]));
    shuffle(createDeck(Number(currentRoom.deckCount||1),Boolean(currentRoom.includeJokers))).forEach((card,i)=>hands.get(participants[i%participants.length].uid).push(card));
    participants.forEach(p=>{ const cards=sortCards(hands.get(p.uid)||[]); batch.set(handRef(currentRoomCode,p.uid),{uid:p.uid,cards,updatedAt:ts()},{merge:true}); batch.set(playerRef(currentRoomCode,p.uid),{cardCount:cards.length,finishedPosition:null,roleTitle:'',hasPassed:false,gameStarted:true,startSignal:firebase.firestore.FieldValue.increment(1),gameStartedAt:ts()},{merge:true}); });
    const starter=participants[Math.floor(Math.random()*participants.length)];
    const game={phase:'playing',turnOrder:participants.map(p=>p.uid),turnUid:starter.uid,turnName:starter.name,tableCombo:null,tableOwnerUid:'',passes:{},history:[],finishedOrder:[],turnCounter:0,lastMessage:`${starter.name} foi sorteado e inicia a partida online.`};
    batch.set(roomRef(currentRoomCode),{phase:'playing',game,startedAt:ts(),updatedAt:ts(),publicMessage:game.lastMessage,gameStateVersion:firebase.firestore.FieldValue.increment(1)},{merge:true});
    await batch.commit();
  }

  function enterOnlineTable(force=false){
    if(!currentRoomCode) return;
    if(!currentRoom && !force) return;
    collectDom();
    stopMenuMusic();
    try{ window.jcSfx?.stopAll?.(); }catch(error){}
    onlineMode=true;
    if(dom.modal)dom.modal.hidden=true;
    if(dom.homeLobbyPanel)dom.homeLobbyPanel.hidden=true;
    ensureOnlineTableVisible();
    renderOnlineGame();
  }
  function unfinishedUids(game){ const fin=new Set(game.finishedOrder||[]); return (game.turnOrder||[]).filter(uid=>!fin.has(uid)); }
  function nextUid(game,fromUid,includePassed=false){ const order=game.turnOrder||[]; const start=Math.max(0,order.indexOf(fromUid)); const fin=new Set(game.finishedOrder||[]); for(let o=1;o<=order.length;o++){const uid=order[(start+o)%order.length]; if(fin.has(uid))continue; if(!includePassed&&game.passes?.[uid])continue; return uid;} return order.find(uid=>!fin.has(uid))||''; }

  function renderOnlineGame(){
    if(!onlineMode)return; collectDom();
    if(!currentRoom || !currentRoom.game){ renderOnlineWaitingTable(); return; }
    const game=currentRoom.game; const isMyTurn=game.phase==='playing'&&game.turnUid===currentUser?.uid;
    const turnPlayer=currentPlayers.find(p=>p.uid===game.turnUid);
    const selected=currentHand.filter(c=>selectedCardIds.has(c.id)); const reason=invalid(selected,game.tableCombo);
    if(dom.roomInfo)dom.roomInfo.textContent=`Sala online ${currentRoomCode}`;
    if(dom.turnInfo)dom.turnInfo.textContent=game.phase==='finished'?'Partida online encerrada':`Vez de ${turnPlayer?.name||game.turnName||'jogador'}`;
    if(dom.ruleHint)dom.ruleHint.textContent=game.tableCombo?`Vença: ${desc(game.tableCombo)}`:'Mesa livre: jogue uma ou mais cartas do mesmo valor.';
    playOnlineSfx(game); renderPlayers(game); renderTable(game); renderHistory(game); renderHand(isMyTurn); renderControls(isMyTurn,reason,selected);
    if(game.phase==='finished')renderFinish(game);
    if(isHost()) scheduleBotIfNeeded('render-online-game');
  }
  function renderOnlineWaitingTable(){
    collectDom();
    if(dom.roomInfo) dom.roomInfo.textContent = currentRoomCode ? `Sala online ${currentRoomCode}` : 'Sala online';
    if(dom.turnInfo) dom.turnInfo.textContent = isHost() ? 'Sala criada. Inicie quando todos estiverem prontos.' : 'Aguardando o anfitrião iniciar';
    if(dom.ruleHint) dom.ruleHint.textContent = 'Você já está na mesa. A partida aparecerá automaticamente aqui.';
    if(dom.playersSummary){
      const total=currentPlayers.length;
      dom.playersSummary.innerHTML = currentPlayers.length ? currentPlayers.map(p=>{
        const isMe=p.uid===currentUser?.uid;
        const role=p.uid===currentRoom?.hostUid?'Host':p.isBot?'IA':'Convidado';
        return `<article class="playerBadge ${isMe?'localPlayerBadge':'opponentBadge'} ${total>10?'ultraCompact':total>6?'compact':''}"><strong>${esc(p.name||'Jogador')}</strong><span class="cardsCount">${p.ready?'✓':'…'}</span><em>${role}</em></article>`;
      }).join('') : '<article class="playerBadge localPlayerBadge"><strong>Conectando...</strong><span class="cardsCount">…</span><em>Sala</em></article>';
    }
    if(dom.tableCards){
      dom.tableCards.innerHTML = '<div class="onlineTableNotice"><strong>Aguardando início</strong><span>Quando o anfitrião clicar em Iniciar partida, esta tela vira a mesa automaticamente.</span><small>Não feche esta aba.</small></div>';
    }
    if(dom.roundHistory) dom.roundHistory.innerHTML = '<span>Jogadores conectados aparecerão acima.</span>';
    if(dom.playerHand) dom.playerHand.innerHTML = '<p class="observerNotice">Suas cartas serão distribuídas quando a partida começar.</p>';
    if(dom.playButton) dom.playButton.disabled = true;
    if(dom.passButton) dom.passButton.disabled = true;
    if(dom.rematchButton) dom.rematchButton.hidden = true;
    if(dom.selectionMessage) dom.selectionMessage.textContent = isHost() ? 'Use o lobby para iniciar a partida.' : 'Você está pronto. Aguarde o anfitrião.';
  }

  function playOnlineSfx(game){
    if(!game) return;
    if(game.phase !== lastSfxPhase){
      lastSfxPhase = game.phase || '';
      if(game.phase === 'finished') sfx('finish');
    }
    const turn = Number(game.turnCounter || 0);
    if(turn === lastSfxTurnCounter) return;
    lastSfxTurnCounter = turn;
    const last = (game.history || [])[Math.max(0, (game.history || []).length - 1)];
    if(!last) return;
    if(last.type === 'pass') sfx('pass');
    if(last.type === 'play'){
      const count = Number(game.tableCombo?.count || 1);
      if(game.tableCombo && isBreaker(game.tableCombo)) sfx('breaker');
      else sfx('card', count);
    }
  }

  function renderPlayers(game){ if(!dom.playersSummary)return; const fin=new Set(game.finishedOrder||[]); const total=currentPlayers.length; dom.playersSummary.innerHTML=currentPlayers.map(p=>{const idx=(game.finishedOrder||[]).indexOf(p.uid); const role=idx>=0?rankName(idx,total):p.isBot?'IA':(p.uid===currentRoom?.hostUid?'Host':''); const isMe=p.uid===currentUser?.uid; return `<article class="playerBadge ${p.uid===game.turnUid?'active':''} ${game.passes?.[p.uid]?'passed':''} ${fin.has(p.uid)?'finished':''} ${isMe?'localPlayerBadge':'opponentBadge'} ${total>10?'ultraCompact':total>6?'compact':''}"><strong>${esc(p.name||'Jogador')}</strong><span class="cardsCount">🂠 ${Number(p.cardCount||0)}</span>${role?`<em>${esc(role)}</em>`:''}</article>`;}).join('');}
  function renderTable(game){
    if(!dom.tableCards)return; dom.tableCards.innerHTML='';
    if(!game.tableCombo){dom.tableCards.innerHTML='<p class="emptyTable">Mesa livre</p>';return;}
    const owner=currentPlayers.find(p=>p.uid===game.tableCombo.playerUid);
    const label=document.createElement('div'); label.className='tableOwner'; label.textContent=`Líder: ${owner?.name||game.tableCombo.playerName||'Jogador'}`; dom.tableCards.appendChild(label);
    const caption=document.createElement('div'); caption.className='tableComboCaption'; caption.textContent=desc(game.tableCombo); dom.tableCards.appendChild(caption);
    const cards=game.tableCombo.cards||[]; const spread=cards.length<=1?0:cards.length===2?44:cards.length===3?36:cards.length===4?28:22; const mid=(cards.length-1)/2;
    cards.forEach((card,i)=>{const el=cardEl(card,true); const c=i-mid; el.style.setProperty('--card-offset',`${c*spread}px`); el.style.setProperty('--card-rotation',`${c*5}deg`); el.style.setProperty('--card-lift',`${Math.abs(c)*2.5}px`); el.style.setProperty('--card-z',`${20+i}`); el.classList.add('playedCard'); if(isBreaker(game.tableCombo))el.classList.add('breakerCard'); dom.tableCards.appendChild(el);});
  }
  function renderHistory(game){ if(!dom.roundHistory)return; const h=game.history||[]; if(!h.length){dom.roundHistory.innerHTML='<span>Nenhuma jogada online ainda.</span>';return;} dom.roundHistory.innerHTML=h.slice(-8).reverse().map(x=>x.type==='pass'?`<div class="historyItem"><strong>${esc(x.playerName)}</strong> <span>passou</span></div>`:`<div class="historyItem"><strong>${esc(x.playerName)}</strong> <span>${esc(x.description||'')}</span></div>`).join('');}
  function playablePowers(hand,table){ const g=new Map(); hand.forEach(c=>{const p=Number(c.power); if(!g.has(p))g.set(p,[]); g.get(p).push(c);}); if(!table)return new Set([...g.keys()]); const out=new Set(); g.forEach((cards,p)=>{if(cards.length>=table.count&&Number(p)>Number(table.power))out.add(Number(p));}); return out;}
  function renderHand(isMyTurn){
    if(!dom.playerHand)return; dom.playerHand.innerHTML='';
    if(currentRoom?.game?.phase==='finished'){dom.playerHand.innerHTML='<p class="observerNotice">Partida online encerrada.</p>';return;}
    if(!currentHand.length){dom.playerHand.innerHTML='<p class="observerNotice">Você já acabou suas cartas ou aguarda distribuição.</p>';return;}
    const powers=playablePowers(currentHand,currentRoom.game.tableCombo);
    currentHand.forEach(card=>{const el=cardEl(card,!isMyTurn); if(isMyTurn)el.classList.add(powers.has(Number(card.power))?'playableHint':'notPlayable'); if(selectedCardIds.has(card.id))el.classList.add('selected'); el.addEventListener('click',()=>{if(!isMyTurn)return; if(selectedCardIds.has(card.id))selectedCardIds.delete(card.id); else selectedCardIds.add(card.id); renderOnlineGame();}); dom.playerHand.appendChild(el);});
  }
  function renderControls(isMyTurn,reason,selected){
    if(dom.playButton)dom.playButton.disabled=!isMyTurn||Boolean(reason);
    if(dom.passButton)dom.passButton.disabled=!isMyTurn||!currentRoom?.game?.tableCombo;
    if(dom.rematchButton)dom.rematchButton.hidden=true;
    if(!dom.selectionMessage)return;
    if(currentRoom?.game?.phase==='finished')dom.selectionMessage.textContent='A partida online terminou.';
    else if(!isMyTurn)dom.selectionMessage.textContent='Aguarde sua vez online.';
    else if(!selected.length)dom.selectionMessage.textContent='Sua vez: selecione cartas do mesmo valor.';
    else if(reason)dom.selectionMessage.textContent=reason;
    else dom.selectionMessage.textContent=`Jogada válida: ${selected.length} carta(s) de ${selected[0].valueStr}.`;
  }
  function renderFinish(game){ if(!dom.tableCards)return; const total=currentPlayers.length; const rows=(game.finishedOrder||[]).map((uid,i)=>{const p=currentPlayers.find(x=>x.uid===uid); return `${i+1}º — ${rankName(i,total)}: ${p?.name||'Jogador'}`;}).join('<br>'); dom.tableCards.innerHTML=`<div class="onlineTableNotice"><strong>Cerimônia da Corte</strong><span>${rows}</span><small>Revanche online virá depois da partida base estabilizar.</small></div>`;}
  function cardEl(card,disabled=false){ const royalTwo = String(card.valueStr) === '2'; const faceSymbol = royalTwo ? '👠' : card.suitSymbol; const faceName = royalTwo ? 'Saltinho Real' : card.suitName; const el=document.createElement('button'); el.className=`card suit-${card.suitId||card.suit}${royalTwo ? ' royalTwo' : ''}`; el.type='button'; el.disabled=disabled; el.dataset.cardId=card.id; el.title=`${card.valueStr} · ${faceName}`; el.innerHTML=`<span class="cardCorner top">${esc(card.valueStr)}<small>${faceSymbol}</small></span><span class="cardSymbol">${faceSymbol}</span><span class="cardCorner bottom">${esc(card.valueStr)}<small>${faceSymbol}</small></span>`; return el; }

  async function sendPlay(){ if(!onlineMode||!currentRoomCode||!currentUser||currentRoom?.game?.turnUid!==currentUser.uid)return; const sel=currentHand.filter(c=>selectedCardIds.has(c.id)); const reason=invalid(sel,currentRoom.game.tableCombo); if(reason){if(dom.selectionMessage)dom.selectionMessage.textContent=reason;return;} await actionsRef(currentRoomCode).add({uid:currentUser.uid,playerName:getPlayerName(),type:'play',cardIds:[...selectedCardIds],processed:false,createdAt:ts()}); selectedCardIds.clear(); renderOnlineGame();}
  async function sendPass(){ if(!onlineMode||!currentRoomCode||!currentUser||currentRoom?.game?.turnUid!==currentUser.uid)return; if(!currentRoom.game.tableCombo)return; await actionsRef(currentRoomCode).add({uid:currentUser.uid,playerName:getPlayerName(),type:'pass',processed:false,createdAt:ts()});}
  async function processActionsAsHost(actions){ if(processingActions||!isHost()||!currentRoom?.game)return; processingActions=true; try{for(const a of actions)await processActionAsHost(a);}finally{processingActions=false;}}
  async function processActionAsHost(action){ if(!action||action.processed)return; const game=currentRoom.game; if(game.phase!=='playing'||action.uid!==game.turnUid){await actionsRef(currentRoomCode).doc(action.id).set({processed:true,rejected:true},{merge:true});return;} if(action.type==='pass')await hostPass(action.uid,action.id); if(action.type==='play')await hostPlay(action.uid,action.cardIds||[],action.id);}
  async function hostPlay(uid,cardIds,actionId=null){
    if(!isHost()||!currentRoom?.game)return; const game=clone(currentRoom.game); if(uid!==game.turnUid)return;
    const snap=await handRef(currentRoomCode,uid).get(); const hand=snap.exists?snap.data().cards||[]:[]; const ids=new Set(cardIds); const selected=hand.filter(c=>ids.has(c.id));
    if(!canPlay(selected,game.tableCombo)){if(actionId)await actionsRef(currentRoomCode).doc(actionId).set({processed:true,rejected:true,reason:'Jogada inválida'},{merge:true});return;}
    const player=currentPlayers.find(p=>p.uid===uid); const remaining=hand.filter(c=>!ids.has(c.id)); const combo={power:Number(selected[0].power),count:selected.length,cards:selected.map(c=>({...c})),playerUid:uid,playerName:player?.name||'Jogador',turn:Number(game.turnCounter||0)+1};
    game.turnCounter=combo.turn; game.tableCombo=combo; game.tableOwnerUid=uid; game.passes={}; game.history=[...(game.history||[]),{type:'play',playerUid:uid,playerName:combo.playerName,description:desc(combo),turn:combo.turn}].slice(-40); game.lastMessage=`${combo.playerName} jogou ${desc(combo)}.`;
    if(remaining.length===0&&!(game.finishedOrder||[]).includes(uid)){game.finishedOrder=[...(game.finishedOrder||[]),uid]; game.lastMessage+=` ${combo.playerName} acabou as cartas!`;}
    const batch=db.batch(); batch.set(handRef(currentRoomCode,uid),{cards:sortCards(remaining),updatedAt:ts()},{merge:true}); batch.set(playerRef(currentRoomCode,uid),{cardCount:remaining.length},{merge:true});
    const unfinished=unfinishedUids(game);
    if(unfinished.length<=1){if(unfinished[0]&&!game.finishedOrder.includes(unfinished[0]))game.finishedOrder.push(unfinished[0]); game.phase='finished'; game.turnUid=''; game.lastMessage='Fim da partida online!';}
    else if(isBreaker(combo)){batch.set(roomRef(currentRoomCode),{game,publicMessage:game.lastMessage,updatedAt:ts()},{merge:true}); if(actionId)batch.set(actionsRef(currentRoomCode).doc(actionId),{processed:true,processedAt:ts()},{merge:true}); await batch.commit(); window.setTimeout(()=>hostClear(uid),850); return;}
    else{game.turnUid=nextUid(game,uid,false); game.turnName=currentPlayers.find(p=>p.uid===game.turnUid)?.name||'';}
    batch.set(roomRef(currentRoomCode),{game,phase:game.phase,publicMessage:game.lastMessage,updatedAt:ts()},{merge:true}); if(actionId)batch.set(actionsRef(currentRoomCode).doc(actionId),{processed:true,processedAt:ts()},{merge:true}); await batch.commit(); currentRoom={...currentRoom,phase:game.phase,game}; window.setTimeout(scheduleBotIfNeeded, 220);
  }
  async function hostPass(uid,actionId=null){
    if(!isHost()||!currentRoom?.game)return; const game=clone(currentRoom.game); if(uid!==game.turnUid||!game.tableCombo)return;
    const player=currentPlayers.find(p=>p.uid===uid); game.passes={...(game.passes||{}),[uid]:true}; game.turnCounter=Number(game.turnCounter||0)+1; game.history=[...(game.history||[]),{type:'pass',playerUid:uid,playerName:player?.name||'Jogador',turn:game.turnCounter}].slice(-40); game.lastMessage=`${player?.name||'Jogador'} passou.`;
    const challengers=unfinishedUids(game).filter(x=>x!==game.tableOwnerUid); const everyone=challengers.length===0||challengers.every(x=>game.passes?.[x]); const batch=db.batch();
    if(everyone){batch.set(roomRef(currentRoomCode),{game,publicMessage:'A corte observa a última jogada antes da mesa limpar.',updatedAt:ts()},{merge:true}); if(actionId)batch.set(actionsRef(currentRoomCode).doc(actionId),{processed:true,processedAt:ts()},{merge:true}); await batch.commit(); currentRoom={...currentRoom,game}; window.setTimeout(()=>hostClear(game.tableOwnerUid),850); return;}
    game.turnUid=nextUid(game,uid,false); game.turnName=currentPlayers.find(p=>p.uid===game.turnUid)?.name||''; batch.set(roomRef(currentRoomCode),{game,publicMessage:game.lastMessage,updatedAt:ts()},{merge:true}); if(actionId)batch.set(actionsRef(currentRoomCode).doc(actionId),{processed:true,processedAt:ts()},{merge:true}); await batch.commit(); currentRoom={...currentRoom,game}; window.setTimeout(scheduleBotIfNeeded, 220);
  }
  async function hostClear(ownerUid){
    if(!isHost())return; const snap=await roomRef(currentRoomCode).get(); if(!snap.exists)return; const game=clone(snap.data().game||{}); if(game.phase!=='playing')return;
    game.tableCombo=null; game.tableOwnerUid=''; game.passes={}; const unfinished=unfinishedUids(game);
    if(!unfinished.length){game.phase='finished'; game.turnUid='';} else if(ownerUid&&unfinished.includes(ownerUid))game.turnUid=ownerUid; else game.turnUid=nextUid(game,ownerUid||game.turnUid,true)||unfinished[0];
    game.turnName=currentPlayers.find(p=>p.uid===game.turnUid)?.name||''; game.lastMessage=game.phase==='finished'?'Fim da partida online!':`Mesa limpa. ${game.turnName||'Jogador'} inicia a nova rodada.`;
    if(game.phase !== 'finished') sfx('tableClear', 'normal');
    await roomRef(currentRoomCode).set({game,phase:game.phase,publicMessage:game.lastMessage,updatedAt:ts()},{merge:true}); currentRoom={...currentRoom,phase:game.phase,game}; window.setTimeout(scheduleBotIfNeeded, 220);
  }
  function scheduleBotIfNeeded(reason=''){
    if(!isHost() || !currentRoomCode) return;
    if(botTimer) return;
    botTimer = window.setTimeout(async () => {
      botTimer = null;
      await runBotAutonomy(reason || 'scheduled');
    }, 420 + Math.floor(Math.random()*480));
  }

  async function runBotAutonomy(reason=''){
    // Importante: em GitHub Pages não existe servidor sempre ligado.
    // O navegador do anfitrião apenas executa o motor da sala.
    // A decisão da carta é da IA do bot, não do jogador anfitrião.
    if(botBusy || !isHost() || !currentRoomCode) return;
    botBusy = true;
    try{
      const roomSnap = await roomRef(currentRoomCode).get();
      if(!roomSnap.exists) return;

      const room = roomSnap.data() || {};
      const game = clone(room.game || {});
      currentRoom = {...currentRoom, ...room, game};

      if(game.phase !== 'playing') return;

      const uid = game.turnUid || '';
      const player = currentPlayers.find(p => p.uid === uid);
      const isBotTurn = String(uid).startsWith('bot-') || player?.isBot === true;
      if(!isBotTurn) return;

      const move = await botDecideMove(uid, game);
      if(!move) return;

      await applyBotMove(uid, move, game);
    }catch(error){
      console.warn('Erro na autonomia do bot:', error);
      setStatus(`Erro na IA do bot: ${error.message || error}`, 'error');
    }finally{
      botBusy = false;
      if(isHost() && currentRoom?.game?.phase === 'playing'){
        const uid = currentRoom.game.turnUid || '';
        const isBotTurn = String(uid).startsWith('bot-') || currentPlayers.find(p=>p.uid===uid)?.isBot;
        if(isBotTurn) scheduleBotIfNeeded('bot-chain');
      }
    }
  }

  async function botDecideMove(uid, game){
    const handSnap = await handRef(currentRoomCode, uid).get();
    const hand = handSnap.exists ? sortCards(handSnap.data().cards || []) : [];
    const bot = currentPlayers.find(p => p.uid === uid);
    const name = bot?.name || 'Bot';

    if(!hand.length){
      return {type:'finish-empty', reason:`${name} não tem cartas.`};
    }

    const cards = botChooseCards(hand, game.tableCombo);
    if(cards.length){
      return {
        type:'play',
        cardIds:cards.map(c => c.id),
        cards,
        reason:botExplainChoice(cards, game.tableCombo)
      };
    }

    if(game.tableCombo){
      return {type:'pass', reason:`${name} não tem combinação maior.`};
    }

    // Mesa livre: sempre joga a carta/grupo mais baixo disponível.
    return {type:'play', cardIds:[hand[0].id], cards:[hand[0]], reason:`${name} iniciou com a menor carta.`};
  }

  async function applyBotMove(uid, move, sourceGame){
    if(!move || !uid) return;
    if(move.type === 'play') return applyBotPlay(uid, move.cardIds || [], sourceGame, move.reason || '');
    if(move.type === 'pass') return applyBotPass(uid, sourceGame, move.reason || '');
    if(move.type === 'finish-empty') return applyBotEmptyHand(uid, sourceGame);
  }

  async function applyBotPlay(uid, cardIds, sourceGame, reason=''){
    if(!isHost() || !currentRoomCode) return;
    const game = clone(sourceGame || currentRoom?.game || {});
    if(game.phase !== 'playing' || uid !== game.turnUid) return;

    const handSnap = await handRef(currentRoomCode, uid).get();
    const hand = handSnap.exists ? sortCards(handSnap.data().cards || []) : [];
    const ids = new Set(cardIds || []);
    const selected = hand.filter(c => ids.has(c.id));

    if(!canPlay(selected, game.tableCombo)){
      // Se a IA calculou algo que ficou inválido por mudança de estado,
      // ela passa em mesa ocupada ou tenta menor carta em mesa livre.
      if(game.tableCombo) return applyBotPass(uid, game, 'Jogada recalculada como passe.');
      if(hand.length) return applyBotPlay(uid, [hand[0].id], game, 'Recalculado para carta mínima.');
      return applyBotEmptyHand(uid, game);
    }

    const player = currentPlayers.find(p => p.uid === uid);
    const remaining = hand.filter(c => !ids.has(c.id));
    const combo = {
      power:Number(selected[0].power),
      count:selected.length,
      cards:selected.map(c => ({...c})),
      playerUid:uid,
      playerName:player?.name || 'Bot',
      turn:Number(game.turnCounter || 0) + 1,
      ai:true,
      aiReason:reason || ''
    };

    game.turnCounter = combo.turn;
    game.tableCombo = combo;
    game.tableOwnerUid = uid;
    game.passes = {};
    game.history = [
      ...(game.history || []),
      {type:'play', playerUid:uid, playerName:combo.playerName, description:desc(combo), turn:combo.turn, ai:true}
    ].slice(-40);
    game.lastMessage = `${combo.playerName} jogou ${desc(combo)}.`;

    if(remaining.length === 0 && !(game.finishedOrder || []).includes(uid)){
      game.finishedOrder = [...(game.finishedOrder || []), uid];
      game.lastMessage += ` ${combo.playerName} acabou as cartas!`;
    }

    const batch = db.batch();
    batch.set(handRef(currentRoomCode, uid), {cards:sortCards(remaining), updatedAt:ts()}, {merge:true});
    batch.set(playerRef(currentRoomCode, uid), {
      cardCount:remaining.length,
      lastAiMoveAt:ts(),
      lastAiReason:reason || ''
    }, {merge:true});

    const unfinished = unfinishedUids(game);
    if(unfinished.length <= 1){
      if(unfinished[0] && !game.finishedOrder.includes(unfinished[0])) game.finishedOrder.push(unfinished[0]);
      game.phase = 'finished';
      game.turnUid = '';
      game.lastMessage = 'Fim da partida online!';
    }else if(isBreaker(combo)){
      batch.set(roomRef(currentRoomCode), {game, publicMessage:game.lastMessage, updatedAt:ts()}, {merge:true});
      await batch.commit();
      currentRoom = {...currentRoom, game};
      window.setTimeout(() => hostClear(uid), 850);
      return;
    }else{
      game.turnUid = nextUid(game, uid, false);
      game.turnName = currentPlayers.find(p => p.uid === game.turnUid)?.name || '';
    }

    batch.set(roomRef(currentRoomCode), {game, phase:game.phase, publicMessage:game.lastMessage, updatedAt:ts()}, {merge:true});
    await batch.commit();
    currentRoom = {...currentRoom, phase:game.phase, game};
    scheduleBotIfNeeded('after-bot-play');
  }

  async function applyBotPass(uid, sourceGame, reason=''){
    if(!isHost() || !currentRoomCode) return;
    const game = clone(sourceGame || currentRoom?.game || {});
    if(game.phase !== 'playing' || uid !== game.turnUid || !game.tableCombo) return;

    const player = currentPlayers.find(p => p.uid === uid);
    game.passes = {...(game.passes || {}), [uid]:true};
    game.turnCounter = Number(game.turnCounter || 0) + 1;
    game.history = [
      ...(game.history || []),
      {type:'pass', playerUid:uid, playerName:player?.name || 'Bot', turn:game.turnCounter, ai:true}
    ].slice(-40);
    game.lastMessage = `${player?.name || 'Bot'} passou.`;

    const challengers = unfinishedUids(game).filter(x => x !== game.tableOwnerUid);
    const everyone = challengers.length === 0 || challengers.every(x => game.passes?.[x]);
    const batch = db.batch();
    batch.set(playerRef(currentRoomCode, uid), {lastAiMoveAt:ts(), lastAiReason:reason || ''}, {merge:true});

    if(everyone){
      batch.set(roomRef(currentRoomCode), {game, publicMessage:'A corte observa a última jogada antes da mesa limpar.', updatedAt:ts()}, {merge:true});
      await batch.commit();
      currentRoom = {...currentRoom, game};
      window.setTimeout(() => hostClear(game.tableOwnerUid), 850);
      return;
    }

    game.turnUid = nextUid(game, uid, false);
    game.turnName = currentPlayers.find(p => p.uid === game.turnUid)?.name || '';

    batch.set(roomRef(currentRoomCode), {game, publicMessage:game.lastMessage, updatedAt:ts()}, {merge:true});
    await batch.commit();
    currentRoom = {...currentRoom, game};
    scheduleBotIfNeeded('after-bot-pass');
  }

  async function applyBotEmptyHand(uid, sourceGame){
    const game = clone(sourceGame || currentRoom?.game || {});
    if(!uid || game.phase !== 'playing') return;

    if(!(game.finishedOrder || []).includes(uid)){
      game.finishedOrder = [...(game.finishedOrder || []), uid];
    }

    const unfinished = unfinishedUids(game);
    if(unfinished.length <= 1){
      if(unfinished[0] && !game.finishedOrder.includes(unfinished[0])) game.finishedOrder.push(unfinished[0]);
      game.phase = 'finished';
      game.turnUid = '';
      game.lastMessage = 'Fim da partida online!';
    }else{
      game.turnUid = nextUid(game, uid, true);
      game.turnName = currentPlayers.find(p => p.uid === game.turnUid)?.name || '';
      game.lastMessage = `${currentPlayers.find(p => p.uid === uid)?.name || 'Bot'} terminou as cartas.`;
    }

    await roomRef(currentRoomCode).set({game, phase:game.phase, publicMessage:game.lastMessage, updatedAt:ts()}, {merge:true});
    currentRoom = {...currentRoom, phase:game.phase, game};
    scheduleBotIfNeeded('after-empty-bot');
  }

  function botChooseCards(hand, table){
    const groups = new Map();
    hand.forEach(card => {
      const power = Number(card.power);
      if(!groups.has(power)) groups.set(power, []);
      groups.get(power).push(card);
    });

    const candidates = [];
    groups.forEach((cards, power) => {
      const sorted = sortCards(cards);
      if(!table){
        // Mesa livre: prefere uma carta só para preservar pares/trincas.
        candidates.push(sorted.slice(0, 1));
      }else if(sorted.length >= Number(table.count) && power > Number(table.power)){
        candidates.push(sorted.slice(0, Number(table.count)));
      }
    });

    if(!candidates.length) return [];

    candidates.sort((a,b) => {
      const pa = Number(a[0].power);
      const pb = Number(b[0].power);
      return pa - pb || a.length - b.length;
    });

    // Evita gastar 2/coringa se houver jogada menor suficiente.
    if(table){
      const normal = candidates.filter(cards => Number(cards[0].power) < cardPower('2'));
      if(normal.length) return normal[0];
    }

    return candidates[0];
  }

  function botExplainChoice(cards, table){
    if(!cards?.length) return 'Sem cartas escolhidas.';
    const label = cards[0].valueStr || '?';
    if(!table) return `Iniciou a rodada com ${cards.length} carta(s) de ${label}.`;
    return `Cobriu ${table.count} carta(s) de ${table.cards?.[0]?.valueStr || '?'} com ${cards.length} carta(s) de ${label}.`;
  }

  async function leaveRoom(){
    if(currentRoomCode&&currentUser){
      try{
        if(isHost() && (currentRoom?.phase==='lobby' || currentRoom?.phase==='finished')){
          await clearRoomData(currentRoomCode);
        }else if(currentRoom?.phase==='lobby'){
          await playerRef(currentRoomCode,currentUser.uid).delete();
        }else{
          await playerRef(currentRoomCode,currentUser.uid).set({connected:false,lastSeen:ts()},{merge:true});
        }
      }catch(e){console.warn(e);}
    }
    detachRoom(); currentRoomCode=''; currentRoom=null; currentPlayers=[]; currentHand=[]; onlineMode=false; selectedCardIds.clear(); collectDom(); if(dom.menuScreen){dom.menuScreen.style.display=''; dom.menuScreen.removeAttribute('aria-hidden'); dom.menuScreen.classList.add('active');} if(dom.gameScreen){dom.gameScreen.style.display=''; dom.gameScreen.classList.remove('active');} document.body.classList.remove('onlineGameActive'); document.documentElement.classList.remove('onlineGameActive'); renderLobby(); if(dom.homeLobbyPanel)dom.homeLobbyPanel.hidden=true; setStatus('Você saiu da sala.','ok');
  }
  async function copyRoomCode(){ if(!currentRoomCode)return; try{await navigator.clipboard.writeText(currentRoomCode); setStatus(`Código ${currentRoomCode} copiado.`,'ok');}catch(e){setStatus(`Código da sala: ${currentRoomCode}`,'ok');}}
  async function fetchRoomPlayersDirect(){
    if(!currentRoomCode) return [];
    const snap = await roomRef(currentRoomCode).collection('players').get();
    const players = snap.docs.map(d => ({id:d.id, ...d.data()}));
    players.sort((a,b) => timestampToMs(a.joinedAt) - timestampToMs(b.joinedAt));
    currentPlayers = players;
    return players;
  }


  document.addEventListener('click',e=>{
    const gameAction=e.target.closest('[data-action]')?.dataset.action;
    if(gameAction==='open-online'){openOnlineModal(); return;}
    const b=e.target.closest('[data-online-action]');
    if(!b)return;
    const a=b.dataset.onlineAction;
    if(a==='create-room' || a==='join-room'){
      try{ window.jcVoice?.prime?.({ reason:a }); }catch(error){}
    }
    if(a==='close-online')closeOnlineModal();
    if(a==='create-room')createRoom();
    if(a==='join-room')joinRoom();
    if(a==='toggle-ready')toggleReady();
    if(a==='start-online')startOnline();
    if(a==='leave-room')leaveRoom();
    if(a==='copy-room')copyRoomCode();
  });
  window.addEventListener('DOMContentLoaded',()=>{collectDom(); dom.playButton?.addEventListener('click',e=>{if(!onlineMode)return; e.preventDefault(); e.stopImmediatePropagation(); sendPlay();},true); dom.passButton?.addEventListener('click',e=>{if(!onlineMode)return; e.preventDefault(); e.stopImmediatePropagation(); sendPass();},true);});
  window.addEventListener('beforeunload',()=>{if(currentRoomCode&&currentUser)playerRef(currentRoomCode,currentUser.uid).set({connected:false,lastSeen:ts()},{merge:true});});

  window.setInterval(() => {
    forceSyncStartedRoom('global-watch');
    if(isHost() && currentRoom?.game?.phase === 'playing'){
      scheduleBotIfNeeded('global-watch');
    }
  }, 900);

  window.jcOnline={openLobby:openOnlineModal,getCurrentRoomCode:()=>currentRoomCode,enterOnlineTable,isOnlineMode:()=>onlineMode,leaveRoom,forceEnterIfStarted,forceSyncStartedRoom};
})();
