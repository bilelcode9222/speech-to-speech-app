import { PREMIUM_30_DAY_LIMIT, PREMIUM_DAILY_LIMIT } from '../security/accessControl';

const APPLE_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title} — Nevi</title>
  <style>
    :root{color-scheme:light dark}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:760px;margin:0 auto;padding:40px 22px;line-height:1.6}h1{font-size:34px;line-height:1.15}h2{margin-top:34px}a{color:inherit}small{opacity:.7}.card{border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:16px;padding:18px;margin:22px 0}.muted{opacity:.76}</style>
</head>
<body>
  <h1>${title}</h1>
  <p class="muted">Dernière mise à jour : 6 septembre 2026</p>
  ${body}
  <hr />
  <small>Nevi — application de traduction vocale.</small>
</body>
</html>`;
}

export function termsPage(): string {
  return page(
    "Conditions d'utilisation",
    `
    <p>Les présentes conditions complètent les conditions applicables à votre achat via l’App Store. En utilisant Nevi, vous acceptez également le <a href="${APPLE_EULA}">Contrat de licence utilisateur final standard d’Apple</a> lorsque celui-ci s’applique.</p>

    <h2>Abonnements Nevi Pro</h2>
    <p>Nevi Pro est proposé sous forme d’abonnements renouvelables automatiquement (par exemple hebdomadaire, mensuel ou annuel selon les offres disponibles dans votre App Store). Le prix, la durée et toute période d’essai affichés au moment de l’achat proviennent de l’App Store et prévalent sur toute autre indication.</p>
    <p>Le paiement est débité de votre compte Apple lors de la confirmation de l’achat. L’abonnement se renouvelle automatiquement sauf annulation dans les réglages de votre compte Apple avant le renouvellement. Les essais gratuits et offres introductives dépendent de l’éligibilité déterminée par Apple.</p>

    <h2>Traductions illimitées*</h2>
    <div class="card"><strong>*Usage personnel raisonnable.</strong> Nevi Pro permet un usage continu de la traduction vocale pour un usage personnel normal, dans la limite technique de <strong>${PREMIUM_DAILY_LIMIT} traductions sur toute période de 24 heures</strong> et <strong>${PREMIUM_30_DAY_LIMIT} traductions sur toute période de 30 jours</strong>. Une traduction correspond à une requête de traduction terminée avec succès.</div>
    <p>Ces limites servent à empêcher l’automatisation, le partage massif, la revente, l’extraction systématique et les usages susceptibles de dégrader le service pour les autres utilisateurs ou de générer des coûts anormaux. Elles ne sont pas destinées à limiter un usage humain ordinaire.</p>

    <h2>Version gratuite</h2>
    <p>Une installation peut bénéficier d’un nombre limité de traductions gratuites avant qu’un abonnement Nevi Pro soit requis. Cette allocation gratuite peut être contrôlée côté serveur afin d’éviter les réinitialisations abusives.</p>

    <h2>Exactitude des traductions</h2>
    <p>Nevi fournit une traduction automatique. Les résultats peuvent contenir des erreurs, omissions ou ambiguïtés. Ne vous fiez pas exclusivement à Nevi pour des situations médicales, juridiques, de sécurité ou toute décision critique sans vérification humaine appropriée.</p>

    <h2>Disponibilité</h2>
    <p>Le service dépend d’Internet, de l’App Store, de RevenueCat et de fournisseurs techniques de traitement vocal et linguistique. Une disponibilité permanente et sans erreur ne peut pas être garantie.</p>

    <h2>Utilisation interdite</h2>
    <p>Il est interdit d’utiliser Nevi pour contourner les limites techniques, automatiser massivement les requêtes, revendre l’accès au service, perturber le backend, tester des identifiants ou jetons de manière abusive, ou tenter d’accéder aux clés et infrastructures privées du service.</p>

    <h2>Restauration et gestion de l’abonnement</h2>
    <p>Les achats peuvent être restaurés depuis l’application. La gestion et l’annulation des abonnements sont effectuées via le compte Apple de l’utilisateur.</p>

    <h2>Confidentialité</h2>
    <p>Le traitement des données est décrit dans la <a href="/privacy">Politique de confidentialité Nevi</a>.</p>
    `
  );
}

export function privacyPage(): string {
  return page(
    'Politique de confidentialité',
    `
    <p>Cette politique explique les données traitées lorsque vous utilisez Nevi. Nevi ne demande pas de création de compte, d’adresse e-mail ou de mot de passe pour utiliser l’application.</p>

    <h2>Données traitées</h2>
    <p><strong>Audio du microphone.</strong> Lorsque vous lancez une traduction, l’audio enregistré est transmis au backend Nevi puis au fournisseur de traitement vocal/IA configuré afin de produire la transcription, la traduction et éventuellement la voix de sortie.</p>
    <p><strong>Texte transcrit et traduit.</strong> Le texte issu de l’audio et la traduction sont traités pour fournir la fonctionnalité demandée.</p>
    <p><strong>Identifiant d’installation anonyme.</strong> L’application génère un identifiant technique aléatoire utilisé pour sécuriser les requêtes, appliquer les quotas et relier l’état d’abonnement technique. Cet identifiant n’est pas un compte utilisateur et n’est pas destiné à vous identifier personnellement.</p>
    <p><strong>Données d’achat.</strong> RevenueCat et Apple traitent les informations nécessaires aux achats intégrés, à l’état de l’abonnement et à la restauration des achats. Nevi utilise l’état d’entitlement afin d’autoriser les fonctionnalités Pro.</p>
    <p><strong>Données techniques.</strong> Le backend peut traiter l’adresse IP, des timestamps, codes d’erreur et mesures de latence nécessaires à la sécurité, à la prévention des abus et à la fiabilité du service.</p>

    <h2>Ce que Nevi ne demande pas</h2>
    <p>Nevi ne demande pas de compte utilisateur, nom, adresse e-mail, mot de passe, liste de contacts ni profil social pour fonctionner.</p>

    <h2>Conservation</h2>
    <p>Les fichiers audio temporaires créés sur l’appareil sont destinés à être supprimés après traitement. Le backend Nevi ne journalise pas intentionnellement le contenu audio ni les transcriptions dans ses logs applicatifs. Des fournisseurs tiers peuvent conserver temporairement certaines données selon leurs propres politiques et paramètres de sécurité nécessaires à la fourniture du service et à la prévention des abus.</p>
    <p>Les compteurs d’usage et l’identifiant d’installation peuvent être conservés aussi longtemps que nécessaire pour appliquer les quotas, prévenir les abus et assurer la continuité du service.</p>

    <h2>Prestataires</h2>
    <p>Selon la configuration de production, Nevi peut utiliser notamment Apple (App Store et achats), RevenueCat (gestion technique des abonnements), Render (hébergement backend et stockage) et un fournisseur d’IA/traitement vocal configuré côté serveur tel qu’OpenAI. Ces prestataires traitent uniquement les données nécessaires à leur rôle technique.</p>

    <h2>Sécurité</h2>
    <p>Les communications avec le backend utilisent HTTPS/WSS. Les clés privées des fournisseurs IA restent côté serveur. Les requêtes de traduction nécessitent une session anonyme signée par le backend.</p>

    <h2>Vos choix</h2>
    <p>Vous pouvez refuser l’accès au microphone dans les réglages iOS, ce qui empêche la traduction vocale. Vous pouvez gérer ou annuler un abonnement depuis votre compte Apple et restaurer les achats depuis Nevi.</p>

    <h2>Contact et demandes relatives aux données</h2>
    <p>Pour toute question de confidentialité ou demande relative aux données, utilisez le canal de support indiqué sur la fiche App Store officielle de Nevi.</p>
    `
  );
}
