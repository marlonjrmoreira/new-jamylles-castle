/* Jamylle's Castle v0.6.0 — Chat de voz WebRTC
   Usa Firebase como sinalização e WebRTC para áudio P2P.
*/
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

    const peers = new Map();
    const pendingIce = new Map();
    const remoteAudio = new Map();

    let app = null;
    let auth = null;
    let db = null;
    let currentUser = null;
    let roomCode = '';
    let roomData = null;
    let playerData = null;
    let localStream = null;
    let joined = false;
    let muted = false;
    let participants = [];
    let roomUnsub = null;
    let playerUnsub = null;
    let participantsUnsub = null;
    let signalsUnsub = null;
    let heartbeatTimer = null;
    let uiTimer = null;

    const dom = {};

    function qs(selector){ return document.querySelector(selector); }
    function qsa(selector){ return [...document.querySelectorAll(selector)]; }

    function collectDom(){
        dom.voicePanel = qs('#voicePanel');
        dom.voiceDock = qs('#voiceDock');
        dom.remoteAudioMount = qs('#remoteAudioMount');
    }

    function status(message){
        qsa('.voiceStatus').forEach(el => el.textContent = message);
    }

    function setButtons(){
        qsa('.voiceJoinButton').forEach(button => button.disabled = joined || !roomCode);
        qsa('.voiceMuteButton').forEach(button => {
            button.disabled = !joined || !canSpeak();
            button.textContent = muted ? 'Desmutar' : 'Mutar';
        });
        qsa('.voiceLeaveButton').forEach(button => button.disabled = !joined);
    }

    function escapeHtml(value){
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function serverTimestamp(){
        return firebase.firestore.FieldValue.serverTimestamp();
    }

    function roomRef(){
        return db.collection('rooms').doc(roomCode);
    }

    function voiceParticipantsRef(){
        return roomRef().collection('voiceParticipants');
    }

    function voiceParticipantRef(uid = currentUser?.uid){
        return voiceParticipantsRef().doc(uid);
    }

    function voiceSignalsRef(){
        return roomRef().collection('voiceSignals');
    }

    async function ensureFirebase(){
        if(db && auth && currentUser) return true;
        if(!window.firebase) {
            status('Firebase não carregou');
            return false;
        }
        try{
            app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            const credential = auth.currentUser ? { user: auth.currentUser } : await auth.signInAnonymously();
            currentUser = credential.user || auth.currentUser;
            return true;
        }catch(error){
            console.error(error);
            status('Falha ao conectar voz');
            return false;
        }
    }

    function getRoomCode(){
        return window.jcOnline?.getCurrentRoomCode?.() || '';
    }

    function getPlayerName(){
        return String(qs('#playerName')?.value || qs('#onlinePlayerName')?.value || playerData?.name || 'Jogador').trim().slice(0,16) || 'Jogador';
    }

    function isObserver(){
        return Boolean(playerData?.isObserver || playerData?.role === 'observer');
    }

    function canListen(){
        if(!isObserver()) return true;
        return roomData?.observerVoicePolicy !== 'muted';
    }

    function canSpeak(){
        if(!isObserver()) return true;
        return roomData?.observerVoicePolicy === 'host-can-allow';
    }

    function voicePolicyText(){
        if(!roomData) return '';
        if(roomData.observerVoicePolicy === 'muted') return 'Observadores sem voz';
        if(roomData.observerVoicePolicy === 'host-can-allow') return 'Observadores podem falar';
        return 'Observadores só ouvem';
    }

    function updatePanels(){
        collectDom();
        const code = getRoomCode();
        const inGame = qs('#gameScreen')?.classList.contains('active');
        if(dom.voicePanel) dom.voicePanel.hidden = !code;
        if(dom.voiceDock) dom.voiceDock.hidden = !code || !inGame;
        if(!code){
            status('Fora da voz');
        }else if(joined){
            status(muted ? `Na voz · mic mutado · ${voicePolicyText()}` : `Na voz · mic ligado · ${voicePolicyText()}`);
        }else{
            status(`Fora da voz · ${voicePolicyText()}`);
        }
        setButtons();
        renderParticipants();
    }

    async function bindRoom(code){
        if(code === roomCode) return;
        await leaveVoice();
        roomCode = code;
        if(!roomCode || !await ensureFirebase()){
            updatePanels();
            return;
        }

        roomUnsub = roomRef().onSnapshot(snapshot => {
            roomData = snapshot.exists ? snapshot.data() : null;
            updatePanels();
        });

        playerUnsub = roomRef().collection('players').doc(currentUser.uid).onSnapshot(snapshot => {
            playerData = snapshot.exists ? snapshot.data() : null;
            updatePanels();
        });

        updatePanels();
    }

    function cleanupRoomListeners(){
        if(roomUnsub) roomUnsub();
        if(playerUnsub) playerUnsub();
        roomUnsub = null;
        playerUnsub = null;
        roomData = null;
        playerData = null;
    }

    async function joinVoice(){
        if(!await ensureFirebase()) return;
        const code = getRoomCode();
        if(!code){
            status('Entre ou crie uma sala primeiro');
            return;
        }
        if(code !== roomCode) await bindRoom(code);

        if(!canListen()){
            status('Observadores estão sem voz nesta sala');
            return;
        }

        if(canSpeak()){
            try{
                localStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: false
                });
            }catch(error){
                console.error(error);
                status('Microfone bloqueado');
                return;
            }
        }else{
            localStream = null;
            muted = true;
        }

        joined = true;
        setLocalTracksEnabled();
        window.jcSfx?.stopAll?.();

        await voiceParticipantRef().set({
            uid: currentUser.uid,
            name: getPlayerName(),
            role: playerData?.role || 'player',
            isObserver: isObserver(),
            muted,
            canSpeak: canSpeak(),
            connected: true,
            joinedAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
        }, { merge: true });

        attachVoiceCollections();

        heartbeatTimer = window.setInterval(() => {
            if(joined && roomCode && currentUser){
                voiceParticipantRef().set({
                    connected: true,
                    muted,
                    canSpeak: canSpeak(),
                    lastSeen: serverTimestamp()
                }, { merge: true }).catch(console.warn);
            }
        }, 10000);

        status(muted ? 'Na voz · mic mutado' : 'Na voz · mic ligado');
        updatePanels();
    }

    function attachVoiceCollections(){
        if(participantsUnsub) participantsUnsub();
        if(signalsUnsub) signalsUnsub();

        participantsUnsub = voiceParticipantsRef().onSnapshot(snapshot => {
            participants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            syncPeers();
            renderParticipants();
        }, error => {
            console.error(error);
            status('Erro ao ler voz');
        });

        signalsUnsub = voiceSignalsRef().where('toUid', '==', currentUser.uid).onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if(change.type === 'added') handleSignal(change.doc.id, change.doc.data());
            });
        }, error => {
            console.error(error);
            status('Erro nos sinais de voz');
        });
    }

    function syncPeers(){
        if(!joined || !currentUser) return;
        const active = new Set(participants.filter(p => p.uid && p.uid !== currentUser.uid).map(p => p.uid));

        for(const participant of participants){
            if(!participant.uid || participant.uid === currentUser.uid) continue;
            ensurePeer(participant.uid);
        }

        for(const [uid, peer] of peers.entries()){
            if(!active.has(uid)){
                closePeer(uid);
            }
        }
    }

    function shouldInitiate(peerUid){
        return String(currentUser.uid) < String(peerUid);
    }

    function peerConfig(){
        return {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    function ensurePeer(peerUid){
        if(peers.has(peerUid)) return peers.get(peerUid);

        const pc = new RTCPeerConnection(peerConfig());
        const entry = { pc, makingOffer: false, offerSent: false };
        peers.set(peerUid, entry);

        if(localStream){
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        pc.onicecandidate = event => {
            if(event.candidate){
                sendSignal(peerUid, {
                    type: 'ice',
                    candidate: event.candidate.toJSON()
                });
            }
        };

        pc.ontrack = event => {
            const [stream] = event.streams;
            if(stream) attachRemoteAudio(peerUid, stream);
        };

        pc.onconnectionstatechange = () => {
            if(['failed','disconnected','closed'].includes(pc.connectionState)){
                if(pc.connectionState === 'failed') restartPeer(peerUid);
            }
        };

        if(shouldInitiate(peerUid)){
            window.setTimeout(() => makeOffer(peerUid), 250);
        }

        return entry;
    }

    async function restartPeer(peerUid){
        closePeer(peerUid);
        ensurePeer(peerUid);
    }

    async function makeOffer(peerUid){
        const entry = ensurePeer(peerUid);
        if(entry.offerSent || entry.makingOffer) return;
        try{
            entry.makingOffer = true;
            const offer = await entry.pc.createOffer();
            await entry.pc.setLocalDescription(offer);
            await sendSignal(peerUid, {
                type: 'offer',
                sdp: entry.pc.localDescription.toJSON()
            });
            entry.offerSent = true;
        }catch(error){
            console.error(error);
        }finally{
            entry.makingOffer = false;
        }
    }

    async function sendSignal(toUid, payload){
        if(!roomCode || !currentUser) return;
        await voiceSignalsRef().add({
            ...payload,
            fromUid: currentUser.uid,
            toUid,
            createdAt: serverTimestamp()
        });
    }

    async function handleSignal(docId, signal){
        if(!joined || !signal?.fromUid || signal.fromUid === currentUser?.uid) return;
        const entry = ensurePeer(signal.fromUid);
        const pc = entry.pc;

        try{
            if(signal.type === 'offer'){
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                await flushPendingIce(signal.fromUid);
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendSignal(signal.fromUid, {
                    type: 'answer',
                    sdp: pc.localDescription.toJSON()
                });
            }

            if(signal.type === 'answer'){
                if(!pc.currentRemoteDescription){
                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    await flushPendingIce(signal.fromUid);
                }
            }

            if(signal.type === 'ice' && signal.candidate){
                await addIce(signal.fromUid, signal.candidate);
            }

            await voiceSignalsRef().doc(docId).delete().catch(() => {});
        }catch(error){
            console.warn('Falha ao processar sinal de voz:', error);
            const list = pendingIce.get(signal.fromUid) || [];
            if(signal.type === 'ice') {
                list.push(signal.candidate);
                pendingIce.set(signal.fromUid, list);
            }
        }
    }

    async function addIce(peerUid, candidate){
        const entry = peers.get(peerUid);
        if(!entry) return;
        if(!entry.pc.remoteDescription){
            const list = pendingIce.get(peerUid) || [];
            list.push(candidate);
            pendingIce.set(peerUid, list);
            return;
        }
        await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
    }

    async function flushPendingIce(peerUid){
        const list = pendingIce.get(peerUid) || [];
        pendingIce.set(peerUid, []);
        for(const candidate of list){
            await addIce(peerUid, candidate);
        }
    }

    function attachRemoteAudio(peerUid, stream){
        collectDom();
        if(!dom.remoteAudioMount) return;

        let audio = remoteAudio.get(peerUid);
        if(!audio){
            audio = document.createElement('audio');
            audio.autoplay = true;
            audio.playsInline = true;
            audio.dataset.peerUid = peerUid;
            dom.remoteAudioMount.appendChild(audio);
            remoteAudio.set(peerUid, audio);
        }

        if(audio.srcObject !== stream) audio.srcObject = stream;
        const promise = audio.play();
        if(promise?.catch) promise.catch(() => {});
    }

    function closePeer(peerUid){
        const entry = peers.get(peerUid);
        if(entry){
            entry.pc.onicecandidate = null;
            entry.pc.ontrack = null;
            entry.pc.close();
        }
        peers.delete(peerUid);
        pendingIce.delete(peerUid);

        const audio = remoteAudio.get(peerUid);
        if(audio){
            audio.srcObject = null;
            audio.remove();
        }
        remoteAudio.delete(peerUid);
    }

    function setLocalTracksEnabled(){
        if(!localStream) return;
        localStream.getAudioTracks().forEach(track => {
            track.enabled = !muted && canSpeak();
        });
    }

    async function toggleMute(){
        if(!joined) return;
        if(!canSpeak()){
            muted = true;
            setLocalTracksEnabled();
            status('Você está apenas ouvindo');
            return;
        }

        muted = !muted;
        setLocalTracksEnabled();

        await voiceParticipantRef().set({
            muted,
            canSpeak: canSpeak(),
            lastSeen: serverTimestamp()
        }, { merge: true });

        updatePanels();
    }

    async function leaveVoice(){
        if(!joined && !roomCode){
            cleanupRoomListeners();
            return;
        }

        joined = false;
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = null;

        if(participantsUnsub) participantsUnsub();
        if(signalsUnsub) signalsUnsub();
        participantsUnsub = null;
        signalsUnsub = null;

        for(const uid of [...peers.keys()]) closePeer(uid);

        if(localStream){
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }

        if(roomCode && db && currentUser){
            await voiceParticipantRef().delete().catch(() => {});
        }

        participants = [];
        muted = false;
        status('Fora da voz');
        updatePanels();
    }

    function renderParticipants(){
        const list = participants
            .filter(p => p.connected !== false)
            .sort((a,b) => String(a.name || '').localeCompare(String(b.name || '')));

        qsa('.voiceParticipantList').forEach(container => {
            if(!roomCode){
                container.innerHTML = '';
                return;
            }

            if(!list.length){
                container.innerHTML = '<div class="voicePerson"><span>Ninguém na voz</span><em>aguardando</em></div>';
                return;
            }

            container.innerHTML = list.map(person => {
                const label = person.uid === currentUser?.uid ? `${person.name || 'Você'} (você)` : (person.name || 'Jogador');
                const state = person.canSpeak === false
                    ? 'só ouvindo'
                    : person.muted
                        ? 'mutado'
                        : 'falando';
                return `<div class="voicePerson ${!person.muted && person.canSpeak !== false ? 'speaking' : ''}">
                    <span>${escapeHtml(label)}</span>
                    <em>${escapeHtml(state)}</em>
                </div>`;
            }).join('');
        });
    }

    document.addEventListener('click', event => {
        const button = event.target.closest('[data-voice-action]');
        if(!button) return;
        const action = button.dataset.voiceAction;
        if(action === 'join') joinVoice();
        if(action === 'mute') toggleMute();
        if(action === 'leave') leaveVoice();
    });

    window.addEventListener('beforeunload', () => {
        if(joined && roomCode && currentUser){
            voiceParticipantRef().set({
                connected: false,
                lastSeen: serverTimestamp()
            }, { merge: true });
        }
    });

    uiTimer = window.setInterval(() => {
        const code = getRoomCode();
        if(code && code !== roomCode) bindRoom(code);
        if(!code && roomCode){
            leaveVoice();
            roomCode = '';
            cleanupRoomListeners();
        }
        updatePanels();
    }, 900);

    window.addEventListener('DOMContentLoaded', () => {
        collectDom();
        updatePanels();
    });

    window.jcVoice = {
        join: joinVoice,
        leave: leaveVoice,
        mute: toggleMute,
        isJoined: () => joined,
    };
})();
