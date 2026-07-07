# Jamylle's Castle — Firebase setup v0.5.0

## 1. Ative login anônimo

No Firebase Console:

1. Build > Authentication
2. Get started
3. Sign-in method
4. Anonymous
5. Enable

Sem isso, o lobby online mostrará erro `auth/operation-not-allowed`.

## 2. Ative o Firestore

1. Build > Firestore Database
2. Create database
3. Use uma região próxima, se disponível.
4. Publique regras seguras antes de liberar para outras pessoas.

## 3. Regras sugeridas para a v0.5.0

Estas regras são para a fase de lobby. Elas exigem login anônimo e evitam escrita totalmente pública.

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{roomId} {
      allow read: if request.auth != null;

      allow create: if request.auth != null
        && request.resource.data.hostUid == request.auth.uid;

      allow update: if request.auth != null
        && (
          resource.data.hostUid == request.auth.uid
          || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['updatedAt'])
        );

      allow delete: if request.auth != null
        && resource.data.hostUid == request.auth.uid;

      match /players/{playerId} {
        allow read: if request.auth != null;

        allow create: if request.auth != null
          && playerId == request.auth.uid
          && request.resource.data.uid == request.auth.uid;

        allow update: if request.auth != null
          && (
            playerId == request.auth.uid
            || get(/databases/$(database)/documents/rooms/$(roomId)).data.hostUid == request.auth.uid
          );

        allow delete: if request.auth != null
          && (
            playerId == request.auth.uid
            || get(/databases/$(database)/documents/rooms/$(roomId)).data.hostUid == request.auth.uid
          );
      }
    }
  }
}
```

## 4. Observação sobre senha da sala

A senha da sala na v0.5.0 é uma barreira simples para entrada casual no lobby.
Ela não substitui segurança profissional de servidor, porque o jogo roda no navegador.

## 5. Próxima versão

v0.5.1 deve conectar o estado jogável online:
- host autoritativo;
- mãos privadas por jogador;
- estado público da mesa;
- validação de turnos;
- observador sem acesso a cartas privadas.


## v0.5.1 — Sala unificada

A sala é buscada por código/nome exato. Exemplo:
- Anfitrião cria `CASTELO26`.
- Convidado digita `CASTELO26` e clica em `Buscar / entrar na sala`.

Bots no multiplayer ficam salvos como configuração da sala (`botCount`).
Na próxima etapa jogável, o host será responsável por controlar esses bots.


## v0.5.2 — Início forçado

O anfitrião pode iniciar a partida sem depender de todos marcarem pronto.
Condição mínima: 3 participantes somando jogadores humanos e bots.

Exemplos:
- 1 humano + 2 bots = pode iniciar.
- 2 humanos + 1 bot = pode iniciar.
- 3 humanos + 0 bots = pode iniciar.
