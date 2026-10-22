# Carrousels TikTok Nevi — automatisation cloud

Actif sur Render depuis le 22 octobre 2026 : [nevi-tiktok-carousels](https://dashboard.render.com/cron/crn-dbd67e8n74is73agupeg). Clé Publer dédiée conservée dans les secrets Render, compte TikTok `neviai.app`, base privée `nevi-production`, schéma `nevi_marketing`. La production de l’application utilise toujours sa branche habituelle ; le cron utilise `codex/nevi-tiktok-automation`.

La création et la programmation cloud ont été vérifiées : **10 carrousels, 50 photos de sources distinctes**, cinq publications le 23 octobre et cinq le 24 octobre. Première publication prévue le **23 octobre 2026 à 9 h, heure de Paris** ; sa publication effective sur TikTok n’était pas encore observable lors de l’activation. Aucune confirmation manuelle ou notification mobile n’est nécessaire pour publier. Le cron actif utilise `ENABLED=true` ; la valeur locale par défaut reste désactivée.

## Contenu

Cinq images JPEG 1080 × 1440, photos de pays/monuments, texte blanc avec contour noir. Le globe est un rendu du caractère 🌍 avec Apple Color Emoji sur macOS, conservé comme image pour garder le même rendu sur Linux. Aucun appel à l'action ni « pour voyager ».

1. « Je note les apps / de traduction 🌍 ».
2. Google Traduction — 3/10 — « Trop basique ».
3. Traducteur tournant — 6/10 — « C’était bien à l’époque ».
4. Autre traducteur — 6/10 — « Utile, mais pas / la meilleure ».
5. Nevi — 10/10 — « Pratique pour traduire / et discuter ».

Les deux positions centrales sont exclusivement tirées de DeepL, Apple Traduire, Microsoft Translator, iTranslate, Reverso Context, Papago et Yandex Translate. Deux carrousels consécutifs n'utilisent pas les mêmes applications centrales. Les notes sont les opinions publicitaires demandées par le propriétaire de Nevi, pas les résultats d'un test indépendant ou les notes App Store.

## Fonctionnement dans le cloud

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

## Exploitation

- Exécution Render à la minute 15 de chaque heure UTC. Les horaires de publication sont calculés en Europe/Paris, avec les changements d’heure.
- Les secrets requis sont `PUBLER_API_KEY`, `PUBLER_WORKSPACE_ID`, `PUBLER_ACCOUNT_ID` et `DATABASE_URL`. Ils sont configurés dans Render, jamais dans Git.
- Déploiement manuel de la branche dédiée, Docker Node 24 avec Fontconfig et Liberation Sans. Les modifications du dépôt ne déclenchent pas automatiquement de déploiement du cron.
- Les journaux indiquent les étapes `connected`, `selecting_photos`, `image_ready`, `scheduled`, `complete`, puis `published` lorsque Publer confirme la publication effective.
- Une erreur de publication ou un résultat d’envoi ambigu interrompt les nouveaux envois. Vérifier le calendrier Publer avant toute reprise manuelle d’un état `submitting` ; ne pas supprimer son historique pour forcer un nouvel envoi.
- Pour arrêter les nouvelles créations, passer `ENABLED=false` dans Render. Les publications déjà programmées restent actives dans Publer et doivent être traitées séparément si l’arrêt doit aussi les concerner.

**Validation réelle :** accès privé Postgres, import des images, cinq images par post, visibilité publique, label promotionnel, publication directe, dix horaires et cinquante sources distinctes. Les réponses réelles Publer ont nécessité la prise en charge des jobs sans enveloppe `data` et des calendriers qui renvoient `total:null` sans pagination. Les requêtes sont espacées ; les réponses 429 et les délais de remise à zéro sont respectés. La sélection des photos peut continuer jusqu’à 1 000 résultats par monument à mesure que l’historique de 60 jours grandit. Le cache local des images est éphémère ; l’historique et les délais longs persistent en Postgres.

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

Validation locale : 18 tests automatisés passent, dont la conservation du globe Apple, la niche traduction, les licences, les erreurs HTTP, le cache des photos et les horaires Paris. Audit npm : aucune vulnérabilité connue signalée lors de la préparation.
