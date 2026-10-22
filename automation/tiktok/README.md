# Carrousels TikTok Nevi — préparation locale, inactive

**Consigne du 22 octobre 2026 : terminer, mais ne rien mettre en ligne.**
Aucun cron Render n'a été créé, aucune publication n'a été envoyée à Publer, aucune clé API n'a été générée. `ENABLED=false` par défaut bloque l'exécution avant tout accès réseau ou base de données. Le code n'a pas été poussé sur GitHub.

## Contenu

Cinq images JPEG 1080 × 1440, photos de pays/monuments, texte blanc avec contour noir. Le globe est un rendu du caractère 🌍 avec Apple Color Emoji sur macOS, conservé comme image pour garder le même rendu sur Linux. Aucun appel à l'action ni « pour voyager ».

1. « Je note les apps / de traduction 🌍 ».
2. Google Traduction — 3/10 — « Trop basique ».
3. Traducteur tournant — 6/10 — « C’était bien à l’époque ».
4. Autre traducteur — 6/10 — « Utile, mais pas / la meilleure ».
5. Nevi — 10/10 — « Pratique pour traduire / et discuter ».

Les deux positions centrales sont exclusivement tirées de DeepL, Apple Traduire, Microsoft Translator, iTranslate, Reverso Context, Papago et Yandex Translate. Deux carrousels consécutifs n'utilisent pas les mêmes applications centrales. Les notes sont les opinions publicitaires demandées par le propriétaire de Nevi, pas les résultats d'un test indépendant ou les notes App Store.

## Fonctionnement prévu dans le cloud

Un cron Render horaire prépare les publications des 48 heures suivantes : 9 h, 12 h, 15 h, 18 h, 21 h en Europe/Paris, changements d'heure inclus. Il ne rattrape pas les créneaux passés en publiant en rafale. Publer prend en charge la publication directe sur le compte TikTok connecté `neviai.app` (compte Publer `6ada53b245f45e801c068964`). Il ne s'agit pas d'un simple rappel mobile.

Les photos nouvelles viennent de Wikimedia Commons : photographie JPEG récente, résolution minimale, licence CC0, domaine public ou CC BY 2.0/3.0/4.0. Les licences NC, ND, SA, inconnues et les restrictions explicites sont exclues. Les crédits, les liens vers les sources et les licences CC BY sont inclus dans la légende publique. Les autorisations sont enregistrées dans le manifeste au moment de la sélection. Les mêmes fichiers sont exclus pendant 60 jours. Les tableaux, intérieurs, escaliers, objets de musée et gros plans identifiables dans les métadonnées sont exclus pour privilégier les vues reconnaissables des monuments. Le titre du fichier doit aussi correspondre au monument recherché. La sélection automatique vérifie les métadonnées ; elle ne remplace pas une revue esthétique humaine. Une source indisponible ou un quota atteint interrompt la génération, sans publier d'image de remplacement non vérifiée.

Le premier carrousel déjà préparé conserve ses photos Pexels et son fichier SOURCES.txt. Le mode de prévisualisation avec photos locales utilise ces mêmes images pour contrôler le rendu, sans prétendre tester le renouvellement de la photothèque.

Le label promotionnel TikTok est activé pour la promotion de Nevi. L'ajout automatique de musique est désactivé. Aucune API d'IA payante n'est nécessaire pour ces textes fixes et cette mise en page.

## Prévention des doublons et suivi

Postgres conserve chaque créneau, les images, les licences, les identifiants Publer et l'état du traitement dans le schéma `nevi_marketing`. Un verrou par compte empêche deux exécutions concurrentes. Le programme enregistre l'intention d'envoi **avant** l'appel de programmation. Il ne répète jamais automatiquement un POST ambigu après un délai dépassé ou une coupure : il recherche d'abord le résultat dans Publer, sinon demande une vérification. Les images déjà importées sont réutilisées pour reprendre une génération interrompue.

Une réponse HTTP 200 seule ne vaut pas programmation réussie : le job asynchrone et le calendrier Publer sont contrôlés. Une publication en échec, en attente de validation ou non confirmée bloque les nouveaux envois et fait sortir le cron en erreur. Les créations déjà programmées chez Publer restent chez Publer : désactiver le cron n'annule pas rétroactivement celles-ci.

## Tests locaux

Node 24 :

```sh
cd automation/tiktok
npm ci
npm test
npm run preview -- /chemin/absolu/apercu 1
```

Le mode `preview` n'importe pas le client Publer et ne peut ni programmer ni publier. Pour tester le rendu avec les photos Pexels déjà téléchargées, passer leur dossier comme quatrième argument :

```sh
node src/preview.js /chemin/absolu/apercu 1 /chemin/absolu/assets
```

Tests couverts : changements d'heure Paris, cinq créneaux/jour, niche et rotation des applications, globe conservé, licences et crédits, cinq médias, absence de rappel mobile, absence de répétition d'un envoi ambigu, erreurs des jobs, confirmation dans le calendrier, exécution désactivée sans aucun accès externe.

## Activation ultérieure — pas effectuée

1. Obtenir l'autorisation de mise en ligne et de création d'une clé API Publer dédiée. Le bouton est dans Paramètres → API & Webhooks de Safari.
2. Renseigner `PUBLER_API_KEY`, `PUBLER_WORKSPACE_ID`, `PUBLER_ACCOUNT_ID` et `DATABASE_URL` dans les secrets Render, jamais dans Git ni dans le chat. Utiliser une base disponible en Oregon dans My Workspace, avec accès au seul schéma nécessaire si possible.
3. Déployer ce dossier à partir d'une branche dédiée, sans modifier le service de l'application. Le Dockerfile installe Liberation Sans pour une typographie compatible avec le rendu Arial local.
4. Vérifier la réponse réelle de l'API pour le compte, sa visibilité publique, les formats des réponses, les permissions TikTok, l'import des images et les crédits.
5. Après autorisation, passer `ENABLED=true`, lancer une exécution contrôlée, vérifier les identifiants des publications dans le calendrier et observer la première publication effective. Seulement alors déclarer l'automatisation opérationnelle.

**Limite de validation actuelle :** les appels authentifiés Publer et Postgres et l'exécution Render n'ont pas été testés, faute de secrets configurés et conformément à la demande de ne pas mettre en ligne. Le téléchargement Commons a été corrigé : identification explicite du programme (User-Agent avec URL de contact), miniatures standard de 1920 px retournées par l'API, requêtes espacées, cache de métadonnées et cache local des photos pendant sept jours. Les originaux volumineux ne sont pas demandés. Retry-After est respecté et un délai long est conservé en Postgres entre les exécutions. La reprise attend l'expiration du délai ; elle ne contourne pas la limite. L'API Publer authentifiée reste à valider séparément.

Documentation utilisée :
- https://publer.com/docs/posting/create-posts/media-handling
- https://publer.com/docs/posting/create-posts/content-types/platform-specific-formats/tiktok-video-and-multi-photo-posts
- https://publer.com/docs/api-reference/posts
- https://render.com/docs/cronjobs

## Vérification réelle des nouvelles photos

`node src/verify-photos.js /chemin/absolu/test 5` récupère 25 nouvelles photographies, vérifie leurs dimensions, leur format JPEG, leur empreinte SHA-256 et leurs licences, puis génère cinq carrousels et leurs légendes. Le rapport `verification.json` garde les preuves. Ce script ne contient aucun accès Publer et ne peut pas publier.

Références du correctif :
- https://www.mediawiki.org/wiki/InstantCommons#Common_thumbnail_sizes
- https://attribution.wikimedia.org/technical-implementation.html#user-agent-policy-and-rate-limits

Validation locale : 15 tests automatisés passent, dont la conservation du globe Apple, la niche traduction, les licences, les erreurs HTTP, le cache des photos et les horaires Paris. Audit npm : aucune vulnérabilité connue signalée lors de la préparation.
