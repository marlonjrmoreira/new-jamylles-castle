export class Player{
    constructor(name, isHuman = false, extra = {}){
        this.id = extra.id || globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
        this.name = name;
        this.avatar = extra.avatar || null;
        this.isHuman = Boolean(isHuman);
        this.isObserver = Boolean(extra.isObserver);
        this.isConnected = true;
        this.hand = [];
        this.finishedPosition = null;
        this.role = null;
        this.hasPassed = false;
        this.isBot = !this.isHuman && !this.isObserver;
    }
}
