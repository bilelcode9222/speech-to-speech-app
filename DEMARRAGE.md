# Démarrage — à faire dans l'ordre

Compte 20 minutes la première fois.

---

## 0. Où poser le dossier

Décompresse l'archive, puis glisse le dossier `speech-to-speech-app` sur ton **Bureau**.
Ouvre-le dans VS Code : menu Fichier > Ouvrir un dossier.

Ouvre ensuite le terminal intégré : menu Terminal > Nouveau terminal.

---

## 1. Récupérer les deux clés API

Sans elles, rien ne fonctionnera.

**Groq** (transcription + traduction) — https://console.groq.com
Crée un compte, va dans "API Keys", génère une clé. Elle commence par `gsk_`.
Gratuit, quotas généreux.

**ElevenLabs** (voix) — https://elevenlabs.io
Crée un compte, va dans Profile > API Keys, génère une clé.
Le plan gratuit donne assez de caractères pour tester.

---

## 2. Coller les clés

Dans VS Code, ouvre le fichier `backend/.env` et remplace les valeurs :

```
GROQ_API_KEY=gsk_taVraieCle...
ELEVENLABS_API_KEY=taVraieCle...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
PORT=3000
```

Pas d'espaces autour du `=`, pas de guillemets. Sauvegarde avec Cmd + S.

---

## 3. Installer le backend

Dans le terminal :

```bash
cd backend
npm install
```

Attends la fin (30 s à 2 min). Les lignes jaunes `npm warn` sont normales.

---

## 4. Démarrer le backend

```bash
npm run dev
```

Tu dois voir :

```
OK Serveur démarré sur le port 3000
i  Local     : http://localhost:3000/health
i  Réseau    : http://192.168.X.X:3000/health
```

**Note l'adresse "Réseau"** — tu en as besoin à l'étape 6.

Vérifie dans ton navigateur : ouvre `http://localhost:3000/health`.
Tu dois voir un texte contenant `"status":"ok"`.

**Laisse ce terminal ouvert.** Le serveur doit tourner pendant que tu utilises l'app.

---

## 5. Installer le mobile

Ouvre un **deuxième** terminal dans VS Code (bouton `+` en haut à droite du panneau Terminal), puis :

```bash
cd mobile
npm install
```

---

## 6. Indiquer l'adresse du serveur à l'app

Ouvre `mobile/src/constants/config.ts` et remplace l'adresse par celle notée à l'étape 4 :

```ts
export const SERVER_URL = 'http://192.168.X.X:3000';
```

Garde le `http://` et le `:3000`. Sauvegarde.

**Pourquoi c'est nécessaire :** `localhost` depuis ton téléphone désigne le téléphone
lui-même, pas ton Mac. Il faut donc l'adresse de ton Mac sur le réseau Wi-Fi.

---

## 7. Lancer l'app

```bash
npx expo start
```

Un QR code apparaît.

Sur ton iPhone : installe **Expo Go** depuis l'App Store, puis scanne le QR code
avec l'appareil photo.

**Ton iPhone et ton Mac doivent être sur le même réseau Wi-Fi.**

---

## 8. Premier test

1. L'app demande l'accès au micro → Autoriser
2. En haut, la pastille doit être verte : "Serveur connecté"
3. Choisis tes deux langues
4. **Maintiens** le bouton rond, dis une phrase, **relâche**
5. Le texte apparaît, puis la traduction, puis la voix se déclenche

Sous chaque traduction s'affiche le détail des temps. C'est ton outil pour
repérer quelle étape ralentit la chaîne.

---

# Si ça ne marche pas

**"Serveur hors ligne" (pastille rouge)**
Le backend ne tourne pas, ou l'adresse dans `config.ts` est fausse.
Vérifie que le terminal du backend affiche toujours "Serveur démarré",
et que l'adresse correspond exactement à la ligne "Réseau".

**"Clé manquante ou non remplie" au démarrage du backend**
Tu n'as pas remplacé les valeurs dans `backend/.env`.

**"Clé API Groq invalide"**
La clé est mal copiée. Reprends-la sur console.groq.com, sans espace avant/après.

**"Quota ElevenLabs épuisé"**
Ton solde gratuit de caractères est consommé. Vérifie sur elevenlabs.io.

**"Aucune parole détectée"**
L'enregistrement était trop court ou silencieux. Parle plus longtemps, plus près du micro.

**Le modèle n'existe plus**
Les fournisseurs retirent régulièrement leurs modèles. Va sur
https://console.groq.com/docs/models, prends un modèle de la liste "Production",
et remplace `llmModel` dans `backend/src/config/env.ts`.

---

# Comment ça marche

```
Téléphone                     Ton Mac (backend)              Internet
---------                     -----------------              --------
Micro
  |
  | audio (WebSocket)
  +--------------------------> Whisper Large v3 Turbo ------> Groq
                                        |
                                   texte transcrit
                                        |
                                        v
                               gpt-oss-20b ----------------> Groq
                                        |
                                  texte traduit
                                        |
                                        v
                               Flash v2.5 -----------------> ElevenLabs
                                        |
                                    MP3 base64
  <-------------------------------------+
Haut-parleur
```

Les clés API restent sur ton Mac et ne sont jamais dans l'app. C'est la raison
d'être du backend : une app mobile est décompilable, un serveur ne l'est pas.

---

# Modèles utilisés (vérifiés le 8 août 2026)

| Étape | Modèle | Pourquoi |
|---|---|---|
| Transcription | `whisper-large-v3-turbo` (Groq) | Le plus rapide, multilingue |
| Traduction | `openai/gpt-oss-20b` (Groq) | ~1000 tokens/s |
| Voix | `eleven_flash_v2_5` (ElevenLabs) | ~75 ms, 32 langues |

**Attention :** `llama-3.3-70b-versatile` a été déprécié par Groq le 17 juin 2026
et sera arrêté le 16 août 2026. Ne l'utilise pas. Les modèles bougent vite —
si une erreur "model does not exist" apparaît un jour, c'est là qu'il faut regarder.

---

# Pour aller vers l'App Store

Ce qui existe aujourd'hui tourne en développement via Expo Go. Pour publier,
il faudra encore :

1. Héberger le backend en ligne (Railway, Render, Fly.io) au lieu de ton Mac
2. Un compte Apple Developer (99 $/an)
3. Générer l'app avec EAS Build : `npx eas build --platform ios`
4. Créer icône et écran de lancement dans `mobile/assets/`
5. Fiche App Store, captures d'écran, politique de confidentialité

C'est une deuxième phase entière. Fais d'abord tourner l'app sur ton téléphone.
