# Jamylle's Castle — Firebase setup v0.5.3

A v0.5.3 precisa destas regras novas para mãos privadas e ações online.

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

    match /rooms/{roomId} {
      allow read: if signedIn();

      allow create: if signedIn()
        && request.resource.data.hostUid == request.auth.uid;

      allow update: if isHost(roomId);

      allow delete: if isHost(roomId);

      match /players/{playerId} {
        allow read: if signedIn();

        allow create: if signedIn()
          && (
            (playerId == request.auth.uid && request.resource.data.uid == request.auth.uid)
            || isHost(roomId)
          );

        allow update: if signedIn()
          && (
            playerId == request.auth.uid
            || isHost(roomId)
          );

        allow delete: if signedIn()
          && (
            playerId == request.auth.uid
            || isHost(roomId)
          );
      }

      match /hands/{playerId} {
        allow read: if signedIn()
          && (
            playerId == request.auth.uid
            || isHost(roomId)
          );

        allow write: if isHost(roomId);
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

        allow update, delete: if isHost(roomId);
      }
    }
  }
}
```

## O que mudou

- `hands/{uid}`: mão privada de cada jogador.
- `actions`: jogadores pedem jogadas; o anfitrião valida.
- `rooms/{sala}.game`: mesa pública, turno, histórico e ranking.
