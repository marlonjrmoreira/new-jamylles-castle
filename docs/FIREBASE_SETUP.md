# Jamylle's Castle — Firebase setup v0.6.1

A v0.6.1 corrige o problema de salas antigas presas no Firestore.

## O que mudou nas Rules

Agora uma sala pode ser reciclada quando:

- a sala está com `phase == "finished"`;
- ou a sala ficou abandonada por mais de 30 minutos, considerando `updatedAt`.

Isso permite reutilizar nomes de salas antigos sem ficar preso ao anfitrião anônimo de ontem.

## Regras Firestore v0.6.1

Cole em:

Firebase Console > Firestore Database > Rules

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function room(roomId) {
      return get(/databases/$(database)/documents/rooms/$(roomId)).data;
    }

    function isHost(roomId) {
      return signedIn() && room(roomId).hostUid == request.auth.uid;
    }

    function isFinishedRoom(roomId) {
      return signedIn() && room(roomId).phase == "finished";
    }

    function isStaleRoom(roomId) {
      return signedIn()
        && room(roomId).updatedAt is timestamp
        && room(roomId).updatedAt < request.time - duration.value(30, "m");
    }

    function canRecycleRoom(roomId) {
      return isHost(roomId) || isFinishedRoom(roomId) || isStaleRoom(roomId);
    }

    match /rooms/{roomId} {
      allow read: if signedIn();

      allow create: if signedIn()
        && request.resource.data.hostUid == request.auth.uid;

      allow update: if isHost(roomId)
        || (
          canRecycleRoom(roomId)
          && request.resource.data.hostUid == request.auth.uid
          && request.resource.data.phase == "lobby"
        );

      allow delete: if canRecycleRoom(roomId);

      match /players/{playerId} {
        allow read: if signedIn();

        allow create: if signedIn()
          && (
            (playerId == request.auth.uid && request.resource.data.uid == request.auth.uid)
            || isHost(roomId)
            || canRecycleRoom(roomId)
          );

        allow update: if signedIn()
          && (
            playerId == request.auth.uid
            || isHost(roomId)
            || canRecycleRoom(roomId)
          );

        allow delete: if signedIn()
          && (
            playerId == request.auth.uid
            || isHost(roomId)
            || canRecycleRoom(roomId)
          );
      }

      match /hands/{playerId} {
        allow read: if signedIn()
          && (
            playerId == request.auth.uid
            || isHost(roomId)
          );

        allow write: if isHost(roomId) || canRecycleRoom(roomId);
      }

      match /actions/{actionId} {
        allow create: if signedIn()
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.processed == false;

        allow read: if signedIn()
          && (
            resource.data.uid == request.auth.uid
            || isHost(roomId)
          );

        allow update, delete: if isHost(roomId) || canRecycleRoom(roomId);
      }

      match /voiceParticipants/{playerId} {
        allow read: if signedIn();

        allow create, update, delete: if signedIn()
          && (
            playerId == request.auth.uid
            || isHost(roomId)
            || canRecycleRoom(roomId)
          );
      }

      match /voiceSignals/{signalId} {
        allow create: if signedIn()
          && request.resource.data.fromUid == request.auth.uid
          && request.resource.data.toUid is string;

        allow read: if signedIn()
          && (
            resource.data.toUid == request.auth.uid
            || resource.data.fromUid == request.auth.uid
            || isHost(roomId)
          );

        allow update, delete: if signedIn()
          && (
            resource.data.toUid == request.auth.uid
            || resource.data.fromUid == request.auth.uid
            || isHost(roomId)
            || canRecycleRoom(roomId)
          );
      }
    }
  }
}
```

## Como testar a correção

1. Publique estas Rules.
2. Suba a v0.6.1 no GitHub.
3. Crie uma sala com o mesmo nome de ontem.
4. Se a sala antiga estiver finalizada ou abandonada por mais de 30 minutos, o jogo deve reaproveitar o nome.
5. Se ainda aparecer como ativa, abra o Firestore e apague manualmente o documento antigo em `rooms/{NOME_DA_SALA}` uma única vez.
