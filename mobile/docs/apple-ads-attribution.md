# Apple Ads et RevenueCat — Nevi AI

## Implémentation et compatibilité vérifiées

Base examinée : main, commit ebaa1bac8b93312ff90b62c4d001488b1d55f149.
Le lockfile installe react-native-purchases 10.9.0 ; sa déclaration TypeScript
expose enableAdServicesAttributionTokenCollection(): Promise<void>. Son pont
RNPurchases.m protège l’appel par un contrôle natif de disponibilité iOS 14.3.
Aucune mise à jour du SDK ou modification du projet natif n’est nécessaire pour cet appel.

Le service conserve configure(), getInstallationId(), puis logIn(). L’attribution
est activée après identification, une fois par initialisation réussie. Les erreurs
synchrones et rejets de la méthode sont isolés de la configuration des achats.
Les clés Test Store de développement ne déclenchent pas AdServices. Les gardes
existantes iOS, clé absente et Test Store en production restent actives.
La résolution de la méthode confirme l’activation, pas la réception des données.

Expo : utiliser une development build ou une build App Store avec le module natif ;
Expo Go/Preview API Mode ne valide pas AdServices réel. expo-dev-client est déjà
présent. Aucune demande ATT n’est ajoutée : collecte Standard, sans IDFA.

## Configuration RevenueCat à effectuer / vérifier

État du compte non vérifié ; aucune modification du tableau de bord effectuée.

1. Projet Nevi AI → Integrations → Apple AdServices → Add Apple Search Ads integration.
2. Faire correspondre Basic/Advanced au compte Apple. Pour l’analyse détaillée,
   Advanced → Sign in with Apple → autoriser RevenueCat en lecture seule et vérifier
   la connexion et l’accès à tous les groupes de campagnes concernés.
3. Charts : filtrer Attribution source = Apple Search Ads ; segmenter par campagne,
   groupe ou mot-clé. Examiner essais, conversion essai-vers-payant, revenus et LTV.
   Comparer des cohortes d’acquisition au même âge ; ne pas diviser les revenus du
   jour par les essais du jour. Rapprocher les dépenses Apple pour calculer CAC/ROAS.

AdServices nécessite iOS 14.3+. Standard fonctionne sans ATT ; Detailed exige ATT.
Les installations de groupes ciblant âge/sexe peuvent être non attribuées depuis
septembre 2026. Basic/TestFlight peuvent produire Unspecified. Prévoir jusqu’à
sept jours pour observer des données exploitables.

## Ce que cela optimise

L’attribution relie acquisition et résultats commerciaux pour guider les décisions
de budget, mots-clés et enchères. Elle ne transmet pas ici un objectif d’achat à
l’algorithme Apple. Apple décrit Maximize Conversions comme une optimisation des
téléchargements au CPA cible, pas des abonnements ou du ROAS. Cette modification
ne configure ni retour d’événements payants, ni enchérisseur, ni garantie de rentabilité.
Toute automatisation future exige un mécanisme distinct, vérifié et configuré.

## Validation et mise en production

- npm ci --ignore-scripts, npm test : 10 tests réussis ; npm run check : réussi.
- Tests : ordre et concurrence, clés/plateformes, erreurs d’attribution, reprise
  après échec de login, entitlement, éligibilité et synchronisation backend.
- CI mobile exécute désormais ces tests ; aucune dépendance de test ajoutée.
- Non exécuté ici : compilation Xcode/EAS et parcours StoreKit sur appareil.
- Avant livraison : compiler iOS avec le lockfile, vérifier achat, restauration,
  démarrage d’essai et premium après relance avec un compte sandbox. Ces tests
  vérifient les abonnements ; ils ne prouvent pas une attribution publicitaire réelle.
- Après livraison : suivre une nouvelle installation App Store issue d’une campagne
  réelle, vérifier le client identifié dans RevenueCat puis sa campagne dans Charts.
  Vérifier ensuite essai et première échéance payante ; ne pas attendre de rétroactivité
  garantie sur les anciennes installations. Ne jamais journaliser le jeton AdServices.

Sources officielles consultées le 17 octobre 2026 :
- https://www.revenuecat.com/docs/integrations/attribution/apple-search-ads
- https://www.revenuecat.com/docs/getting-started/installation/expo
- https://github.com/RevenueCat/react-native-purchases/blob/10.9.0/src/purchases.ts
- https://github.com/RevenueCat/react-native-purchases/blob/10.9.0/ios/RNPurchases.m
- https://ads.apple.com/app-store/best-practices/maximize-conversions
