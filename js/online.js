/* Jamylle's Castle v0.5.2 — Lobby multiplayer online via Firebase
   Fundação: criar sala, entrar por código, senha, host e pronto/não pronto.
   A partida online jogável e WebRTC serão conectados nas próximas versões. */

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

    let app = null;
    let auth = null;
    let db = null;
    let currentUser = null;
    let currentRoomCode = '';
    let currentRoom = null;
    let currentPlayers = [];
    let roomUnsub = null;
    let playersUnsub = null;
    let heartbeatTimer = null;

    const dom = {};

    function qs(selector){ return document.querySelector(selector); }

    function collectDom(){
        dom.modal = qs('#onlineModal');
        dom.status = qs('#onlineStatus');
        dom.roomCode = qs('#onlineRoomCode');
        dom.password = qs('#onlineRoomPassword');
        dom.lobby = qs('#onlineLobby');
        dom.lobbyTitle = qs('#onlineLobbyTitle');
        dom.playersList = qs('#onlinePlayersList');
        dom.readyButton = qs('#readyButton');
        dom.startButton = qs('#startOnlineButton');
        dom.playerName = qs('#playerName');
        dom.onlinePlayerName = qs('#onlinePlayerName');
        dom.menuRoomName = qs('#roomName');
        dom.menuPassword = qs('#roomPassword');
        dom.deckCount = qs('#deckCount');
        dom.botCount = qs('#botCount');
        dom.includeJokers = qs('#includeJokers');
        dom.allowObservers = qs('#allowObservers');
        dom.observerVoicePolicy = qs('#observerVoicePolicy');
    }

    function setStatus(message, type = ''){
        if(!dom.status) return;
        dom.status.textContent = message;
        dom.status.classList.toggle('error', type === 'error');
        dom.status.classList.toggle('ok', type === 'ok');
    }

    function normalizeRoomCode(value){
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .toUpperCase()
            .slice(0, 18) || 'CASTELO';
    }

    function getPlayerName(){
        const modalName = String(dom.onlinePlayerName?.value || '').trim();
        const menuName = String(dom.playerName?.value || '').trim();
        const name = (modalName || menuName || 'Jogador').slice(0, 16);
        if(dom.playerName && name) dom.playerName.value = name;
        if(dom.onlinePlayerName && name) dom.onlinePlayerName.value = name;
        return name || 'Jogador';
    }

    function simpleHash(text){
        let hash = 0;
        const input = String(text || '');
        for(let i = 0; i < input.length; i++){
            hash = ((hash << 5) - hash) + input.charCodeAt(i);
            hash |= 0;
        }
        return String(hash);
    }

    function serverTimestamp(){
        return firebase.firestore.FieldValue.serverTimestamp();
    }

    function roomRef(roomCode){
        return db.collection('rooms').doc(roomCode);
    }

    function playerRef(roomCode, uid){
        return roomRef(roomCode).collection('players').doc(uid);
    }

    async function initFirebase(){
        collectDom();

        if(!window.firebase){
            setStatus('Firebase não carregou. Confira sua internet e publique em uma página HTTPS.', 'error');
            return false;
        }

        try{
            app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            const credential = await auth.signInAnonymously();
            currentUser = credential.user || auth.currentUser;
            setStatus('Firebase conectado. Pronto para criar ou entrar em uma sala.', 'ok');
            return true;
        }catch(error){
            console.error(error);
            const message = error?.code === 'auth/operation-not-allowed'
                ? 'Ative Authentication > Anonymous no Firebase Console para usar o multiplayer.'
                : `Falha ao conectar: ${error?.message || error}`;
            setStatus(message, 'error');
            return false;
        }
    }

    function openOnlineModal(){
        collectDom();
        if(dom.modal) dom.modal.hidden = false;
        if(dom.onlinePlayerName && !dom.onlinePlayerName.value){
            dom.onlinePlayerName.value = String(dom.playerName?.value || '').trim() || 'Jogador';
        }
        if(dom.roomCode && !dom.roomCode.value){
            dom.roomCode.value = normalizeRoomCode(dom.menuRoomName?.value || 'CASTELO');
        }
        if(dom.password && !dom.password.value && dom.menuPassword?.value){
            dom.password.value = dom.menuPassword.value;
        }
        initFirebase();
    }

    function closeOnlineModal(){
        if(dom.modal) dom.modal.hidden = true;
    }

    async function createRoom(){
        if(dom.modal) dom.modal.hidden = false;
        if(!await ensureReady()) return;
        const code = normalizeRoomCode(dom.roomCode?.value || dom.menuRoomName?.value || 'CASTELO');
        if(dom.roomCode) dom.roomCode.value = code;
        const password = String(dom.password?.value || dom.menuPassword?.value || '').trim();
        const ref = roomRef(code);
        const snapshot = await ref.get();

        if(snapshot.exists){
            setStatus(`A sala ${code} já existe. Escolha outro código ou entre nela.`, 'error');
            return;
        }

        const roomData = {
            code,
            title: code,
            phase: 'lobby',
            hostUid: currentUser.uid,
            hostName: getPlayerName(),
            passwordProtected: Boolean(password),
            passwordHash: password ? simpleHash(password) : '',
            deckCount: Number(dom.deckCount?.value || 1),
            botCount: Number(dom.botCount?.value || 0),
            includeJokers: Boolean(dom.includeJokers?.checked),
            allowObservers: Boolean(dom.allowObservers?.checked),
            observerVoicePolicy: dom.observerVoicePolicy?.value || 'listen-only',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            voiceReady: false,
            gameStateVersion: 0,
        };

        await ref.set(roomData);
        await playerRef(code, currentUser.uid).set({
            uid: currentUser.uid,
            name: getPlayerName(),
            isHost: true,
            ready: true,
            role: 'host',
            connected: true,
            joinedAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
        }, { merge: true });

        attachRoom(code);
        setStatus(`Sala ${code} criada. Compartilhe o código com os jogadores.`, 'ok');
    }

    async function joinRoom(){
        if(dom.modal) dom.modal.hidden = false;
        if(!await ensureReady()) return;
        const code = normalizeRoomCode(dom.roomCode?.value || dom.menuRoomName?.value || '');
        if(dom.roomCode) dom.roomCode.value = code;
        const password = String(dom.password?.value || '').trim();
        const ref = roomRef(code);
        const snapshot = await ref.get();

        if(!snapshot.exists){
            setStatus(`Não encontrei a sala ${code}. Confira o nome/código ou peça ao anfitrião para criar a sala primeiro.`, 'error');
            return;
        }

        const room = snapshot.data();
        if(room.passwordProtected && simpleHash(password) !== room.passwordHash){
            setStatus('Senha incorreta para esta sala.', 'error');
            return;
        }

        await playerRef(code, currentUser.uid).set({
            uid: currentUser.uid,
            name: getPlayerName(),
            isHost: currentUser.uid === room.hostUid,
            ready: false,
            role: currentUser.uid === room.hostUid ? 'host' : 'player',
            connected: true,
            joinedAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
        }, { merge: true });

        await ref.set({ updatedAt: serverTimestamp() }, { merge: true });
        attachRoom(code);
        setStatus(`Você entrou na sala ${code}.`, 'ok');
    }

    async function ensureReady(){
        if(db && auth && currentUser) return true;
        return initFirebase();
    }

    function attachRoom(code){
        detachRoom();
        currentRoomCode = code;

        if(dom.lobby) dom.lobby.hidden = false;
        if(dom.lobbyTitle) dom.lobbyTitle.textContent = `Sala ${code}`;

        roomUnsub = roomRef(code).onSnapshot(snapshot => {
            currentRoom = snapshot.exists ? snapshot.data() : null;
            if(!currentRoom){
                setStatus('A sala foi encerrada.', 'error');
                detachRoom();
                renderLobby();
                return;
            }
            renderLobby();
        }, error => {
            console.error(error);
            setStatus(`Erro ao ler a sala: ${error.message}`, 'error');
        });

        playersUnsub = roomRef(code).collection('players').orderBy('joinedAt', 'asc').onSnapshot(snapshot => {
            currentPlayers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderLobby();
        }, error => {
            console.error(error);
            setStatus(`Erro ao ler jogadores: ${error.message}`, 'error');
        });

        heartbeatTimer = window.setInterval(() => {
            if(currentRoomCode && currentUser){
                playerRef(currentRoomCode, currentUser.uid).set({
                    connected: true,
                    lastSeen: serverTimestamp(),
                }, { merge: true }).catch(console.warn);
            }
        }, 15000);
    }

    function detachRoom(){
        if(roomUnsub) roomUnsub();
        if(playersUnsub) playersUnsub();
        roomUnsub = null;
        playersUnsub = null;
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }

    function renderLobby(){
        if(!dom.playersList) return;
        if(!currentRoom || !currentRoomCode){
            dom.playersList.innerHTML = '';
            if(dom.lobby) dom.lobby.hidden = true;
            return;
        }

        const isHost = currentUser?.uid === currentRoom.hostUid;
        const me = currentPlayers.find(player => player.uid === currentUser?.uid);
        const botCount = Number(currentRoom.botCount || 0);
        const totalParticipants = currentPlayers.length + botCount;
        const canForceStart = isHost && totalParticipants >= 3;

        if(currentRoom.phase === 'playing'){
            enterOnlineTable();
        }

        if(dom.readyButton){
            dom.readyButton.textContent = me?.ready ? 'Estou pronto ✓' : 'Estou pronto';
        }
        if(dom.startButton){
            dom.startButton.disabled = !canForceStart;
            dom.startButton.textContent = isHost ? 'Iniciar partida' : 'Aguardando anfitrião';
            dom.startButton.title = canForceStart
                ? 'Forçar início da partida para todos na sala.'
                : 'A sala precisa ter pelo menos 3 participantes somando jogadores humanos e bots.';
        }

        const roomMeta = `
            <div class="onlineRoomMeta">
                <span class="onlinePill">Baralhos: ${Number(currentRoom.deckCount || 1)}</span>
                <span class="onlinePill">Bots: ${Number(currentRoom.botCount || 0)}</span>
                <span class="onlinePill">${currentRoom.includeJokers ? 'Com coringas' : 'Sem coringas'}</span>
                <span class="onlinePill">${currentRoom.passwordProtected ? 'Com senha' : 'Sem senha'}</span>
            </div>
        `;

        dom.playersList.innerHTML = roomMeta + currentPlayers.map(player => {
            const safeName = escapeHtml(player.name || 'Jogador');
            const hostPill = player.uid === currentRoom.hostUid ? '<span class="onlinePill host">Host</span>' : '<span></span>';
            const readyPill = `<span class="onlinePill ${player.ready ? 'ready' : ''}">${player.ready ? 'Pronto' : 'Aguardando'}</span>`;
            return `<article class="onlinePlayerRow"><strong>${safeName}</strong>${hostPill}${readyPill}</article>`;
        }).join('');

        const phaseText = currentRoom.phase === 'lobby'
            ? 'Lobby sincronizado. O anfitrião pode iniciar quando houver participantes suficientes.'
            : currentRoom.phase === 'playing'
                ? 'Partida iniciada. Todos estão sendo levados para a mesa online.'
                : `Estado da sala: ${currentRoom.phase}`;
        setStatus(`${phaseText} Jogadores: ${currentPlayers.length}. Bots: ${Number(currentRoom.botCount || 0)}.`, 'ok');
    }

    async function toggleReady(){
        if(!currentRoomCode || !currentUser) return;
        const me = currentPlayers.find(player => player.uid === currentUser.uid);
        await playerRef(currentRoomCode, currentUser.uid).set({
            ready: !me?.ready,
            lastSeen: serverTimestamp(),
        }, { merge: true });
    }

    async function startOnline(){
        if(!currentRoomCode || !currentUser || !currentRoom) return;
        if(currentUser.uid !== currentRoom.hostUid){
            setStatus('Apenas o anfitrião pode iniciar a partida.', 'error');
            return;
        }

        const botCount = Number(currentRoom.botCount || 0);
        const totalParticipants = currentPlayers.length + botCount;
        if(totalParticipants < 3){
            setStatus('A partida precisa de pelo menos 3 participantes somando jogadores humanos e bots.', 'error');
            return;
        }

        await roomRef(currentRoomCode).set({
            phase: 'playing',
            startedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            gameStateVersion: firebase.firestore.FieldValue.increment(1),
            forcedStartByHost: true,
            publicMessage: 'O anfitrião iniciou a partida. Todos entram na mesa online.',
        }, { merge: true });

        setStatus('Partida iniciada pelo anfitrião. Abrindo mesa online...', 'ok');
        enterOnlineTable();
    }


    function enterOnlineTable(){
        if(!currentRoom || !currentRoomCode) return;

        if(dom.modal) dom.modal.hidden = true;

        const menuScreen = document.querySelector('#menuScreen');
        const gameScreen = document.querySelector('#gameScreen');
        menuScreen?.classList.remove('active');
        gameScreen?.classList.add('active');

        const roomInfo = document.querySelector('#roomInfo');
        const turnInfo = document.querySelector('#turnInfo');
        const ruleHint = document.querySelector('#ruleHint');
        const playersSummary = document.querySelector('#playersSummary');
        const tableCards = document.querySelector('#tableCards');
        const roundHistory = document.querySelector('#roundHistory');
        const playerHand = document.querySelector('#playerHand');
        const selectionMessage = document.querySelector('#selectionMessage');
        const playButton = document.querySelector('#playButton');
        const passButton = document.querySelector('#passButton');
        const rematchButton = document.querySelector('#rematchButton');

        if(roomInfo) roomInfo.textContent = `Sala online ${currentRoomCode}`;
        if(turnInfo) turnInfo.textContent = 'Partida online iniciada';
        if(ruleHint) ruleHint.textContent = 'O anfitrião iniciou a sala. A sincronização jogável completa vem na próxima etapa.';

        const botCount = Number(currentRoom.botCount || 0);
        const playerRows = currentPlayers.map(player => {
            const isHost = player.uid === currentRoom.hostUid;
            return `<article class="playerBadge ${isHost ? 'active' : ''}">
                <strong>${escapeHtml(player.name || 'Jogador')}</strong>
                <span>${isHost ? 'Anfitrião' : 'Jogador online'}</span>
                ${player.ready ? '<em>Pronto</em>' : ''}
            </article>`;
        }).join('');

        const botRows = Array.from({ length: botCount }, (_, index) => `
            <article class="playerBadge">
                <strong>Bot ${index + 1}</strong>
                <span>Controlado pelo anfitrião</span>
                <em>IA</em>
            </article>
        `).join('');

        if(playersSummary) playersSummary.innerHTML = playerRows + botRows;
        if(tableCards){
            tableCards.innerHTML = `
                <div class="onlineTableNotice">
                    <strong>Portões da sala abertos</strong>
                    <span>O anfitrião iniciou a partida online.</span>
                    <small>Próxima etapa: distribuição sincronizada, mãos privadas e turnos em tempo real.</small>
                </div>
            `;
        }
        if(roundHistory) roundHistory.innerHTML = '<span>Aguardando primeira jogada online sincronizada.</span>';
        if(playerHand){
            playerHand.innerHTML = `
                <p class="observerNotice">
                    Você está na mesa online da sala <strong>${escapeHtml(currentRoomCode)}</strong>.<br>
                    Esta versão confirma o início forçado para todos. A próxima versão conectará sua mão privada.
                </p>
            `;
        }
        if(selectionMessage) selectionMessage.textContent = 'Mesa online aberta. Sincronização jogável será conectada na próxima etapa.';
        if(playButton) playButton.disabled = true;
        if(passButton) passButton.disabled = true;
        if(rematchButton) rematchButton.hidden = true;
    }

    async function leaveRoom(){
        if(currentRoomCode && currentUser){
            try{
                await playerRef(currentRoomCode, currentUser.uid).delete();
            }catch(error){
                console.warn(error);
            }
        }
        detachRoom();
        currentRoomCode = '';
        currentRoom = null;
        currentPlayers = [];
        renderLobby();
        setStatus('Você saiu da sala.', 'ok');
    }

    async function copyRoomCode(){
        if(!currentRoomCode) return;
        try{
            await navigator.clipboard.writeText(currentRoomCode);
            setStatus(`Código ${currentRoomCode} copiado.`, 'ok');
        }catch(error){
            setStatus(`Código da sala: ${currentRoomCode}`, 'ok');
        }
    }

    function escapeHtml(value){
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    document.addEventListener('click', event => {
        const gameAction = event.target.closest('[data-action]')?.dataset.action;
        if(gameAction === 'open-online'){
            openOnlineModal();
            return;
        }

        const button = event.target.closest('[data-online-action]');
        if(!button) return;
        const action = button.dataset.onlineAction;

        if(action === 'close-online') closeOnlineModal();
        if(action === 'create-room') createRoom();
        if(action === 'join-room') joinRoom();
        if(action === 'toggle-ready') toggleReady();
        if(action === 'start-online') startOnline();
        if(action === 'leave-room') leaveRoom();
        if(action === 'copy-room') copyRoomCode();
    });

    window.addEventListener('beforeunload', () => {
        if(currentRoomCode && currentUser){
            playerRef(currentRoomCode, currentUser.uid).set({
                connected: false,
                lastSeen: serverTimestamp(),
            }, { merge: true });
        }
    });

    window.jcOnline = {
        openLobby: openOnlineModal,
        getCurrentRoomCode: () => currentRoomCode,
        enterOnlineTable,
    };
})();
