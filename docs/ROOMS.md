# ROOMS.md — Salas e senhas

## Tipos de sala

- **Privada sem senha:** entrada por nome/código da sala.
- **Privada com senha:** entrada por nome/código + senha.
- **Pública:** aparece em lista pública futura.

## Campos da sala

```text
roomName
passwordProtected
passwordHash
deckCount
includeJokers
allowObservers
observerVoicePolicy
disconnect.graceSeconds
disconnect.action
```

## Coringas

O padrão regional do projeto é sem coringas.

```text
includeJokers: false
```

O anfitrião pode ativar manualmente antes de iniciar.
