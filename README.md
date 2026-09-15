# Nevi — traduction vocale en temps réel

Application mobile de traduction parole-à-parole.
Tu parles, l'app transcrit, traduit et prononce dans la langue cible.

**Commence par lire DEMARRAGE.md.**

## Structure

```text
backend/    Serveur Node.js — orchestre les appels IA et garde les clés secrètes
mobile/     Application React Native (Expo)
```

## Pipeline IA

Le backend choisit les fournisseurs avec les variables `AI_PROVIDER` et `TTS_PROVIDER`.
Les valeurs par défaut actuelles sont :

- Transcription : OpenAI Whisper (`whisper-1`)
- Traduction : OpenAI (`gpt-4o-mini`)
- Synthèse vocale : OpenAI (`tts-1`)
- Alternatives disponibles : Groq, Gemini et ElevenLabs
- Transport principal : Socket.IO / WebSocket

Gemini Live n'est pas exposé par le serveur de production V1 tant que le client mobile de production ne l'utilise pas.

## Sécurité sans compte utilisateur

Nevi ne demande aucun login, mot de passe ou création de compte.

Au premier lancement, l'app génère automatiquement un identifiant d'installation local et demande au backend une session anonyme signée. Cette session est ensuite envoyée lors de la connexion Socket.IO. Le backend refuse les sockets et l'endpoint HTTP de traduction sans session valide et applique des limites par installation et par adresse réseau réelle derrière Render.

Les clés OpenAI, Groq, Gemini, ElevenLabs et RevenueCat serveur restent exclusivement dans les variables d'environnement backend. Elles ne sont jamais intégrées dans l'application mobile.

RevenueCat est configuré côté mobile pour les achats Apple et le backend vérifie également l'entitlement `nevi_pro` via l'API serveur RevenueCat avant d'autoriser les usages Pro.

## Quotas et politique d'usage

- Nouvel utilisateur : accès à Nevi Pro via l’essai gratuit proposé par l’App Store.
- Nevi Pro : traductions illimitées* dans le cadre d'un usage personnel raisonnable.
- Fair Use : maximum 100 traductions sur toute période de 24 heures et 1 000 traductions sur toute période de 30 jours.
- Une seule traduction IA peut être active simultanément par installation.

Le backend est l'autorité finale : le compteur mobile sert uniquement à rendre l'interface réactive.

Les pages publiques sont exposées par le backend :

- `/terms` — Conditions d'utilisation, abonnement et Fair Use.
- `/privacy` — Politique de confidentialité.

## Variables de production

```text
ANONYMOUS_SESSION_SECRET=...
DATABASE_URL=...
REVENUECAT_SERVER_API_KEY=...
REVENUECAT_ENTITLEMENT_ID=nevi_pro
ANALYTICS_DASHBOARD_TOKEN=...
REVENUECAT_WEBHOOK_AUTHORIZATION=...
UNIT_ECONOMICS_CAC_USD=1.50
UNIT_ECONOMICS_STORE_NET_REVENUE_SHARE=0.70
```

`ANONYMOUS_SESSION_SECRET` peut être générée avec :

```bash
openssl rand -hex 32
```

`DATABASE_URL` doit pointer vers un Postgres persistant en production afin que les quotas survivent aux redéploiements et fonctionnent avec plusieurs instances.

`REVENUECAT_SERVER_API_KEY` est une clé serveur REST RevenueCat. Elle ne doit jamais être placée dans une variable `EXPO_PUBLIC_*`, dans le mobile, dans GitHub ou dans une conversation.

Le mobile utilise uniquement la clé SDK publique iOS RevenueCat :

```text
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=...
```

## Nevi Pulse — tableau de bord produit

Le backend fournit un tableau de bord léger à l’adresse `/admin/analytics`. Il rassemble les données internes à Nevi : activité, complétion de l’onboarding, exposition au paywall, intentions d’achat, essais démarrés, achats, traductions réussies et erreurs. Il ne collecte ni audio ni contenu de conversation.

Nevi Pulse stocke ses événements dans le Postgres Render déjà utilisé par Nevi. Aucun compte ni clé PostHog n'est nécessaire. Ouvre `https://ton-backend/admin/analytics` et saisis `ANALYTICS_DASHBOARD_TOKEN` : ce code reste dans le navigateur et est transmis uniquement à l’API du backend dans un en-tête HTTP.

Configure également dans RevenueCat un webhook vers `https://ton-backend/webhooks/revenuecat`, avec l’en-tête `Authorization` égal à `REVENUECAT_WEBHOOK_AUTHORIZATION`. Nevi Pulse recevra ainsi les essais réellement confirmés, renouvellements, annulations, expirations et prix en dollars, sans données de conversation.

Nevi Pulse calcule aussi la rentabilité globale et par installation : le revenu affiché est le prix RevenueCat multiplié par `UNIT_ECONOMICS_STORE_NET_REVENUE_SHARE`, afin de ne pas confondre le prix payé et le revenu estimé après commission Apple. Le coût IA est construit à partir de la durée audio, des tokens de traduction et des caractères TTS ; configure les tarifs `UNIT_ECONOMICS_*` lors d’un changement de fournisseur ou de modèle. `UNIT_ECONOMICS_CAC_USD` vaut `1.50` par défaut, conformément au coût d’installation actuel, et peut être adapté à chaque campagne. Une ligne marquée d’un `*` indique qu’un tarif fournisseur ou une mesure de coût manque.

Le funnel cible est : `onboarding terminé → paywall vu → paiement lancé → essai démarré`. Nevi Pulse indique immédiatement l’étape à optimiser, avec un objectif de 20 % d’essais par paywall vu.

## Checklist avant App Store

- RevenueCat : app iOS, Offering courante, produits Weekly / Monthly / Yearly et entitlement `nevi_pro` vérifiés.
- Les essais gratuits doivent être configurés dans App Store Connect et ne sont affichés que lorsque RevenueCat confirme l'éligibilité.
- Render : backend toujours actif, `/health` configuré comme health check et Postgres persistant.
- App Store Connect : Privacy Policy URL = `https://speech-to-speech-app.onrender.com/privacy`.
- Terms of Use / EULA : lien accessible depuis le paywall via `https://speech-to-speech-app.onrender.com/terms`.
- Nouveau build EAS production puis validation TestFlight complète avant soumission.

Ne commit jamais de secret dans GitHub.
