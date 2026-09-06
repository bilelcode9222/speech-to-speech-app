import { config } from '../config/env';
import { PREMIUM_30_DAY_LIMIT, PREMIUM_DAILY_LIMIT } from '../security/accessControl';

const APPLE_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const CNIL_COMPLAINT = 'https://www.cnil.fr/fr/plaintes';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function supportContact(): string {
  const email = config.supportEmail.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Le contact officiel de l’éditeur est celui publié dans la fiche App Store de Nevi et dans les informations réglementaires du fournisseur publiées par Apple.';
  }

  const safeEmail = escapeHtml(email);
  return `Contact : <a href="mailto:${safeEmail}">${safeEmail}</a>`;
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title} — Nevi</title>
  <style>
    :root{color-scheme:light dark}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;max-width:760px;margin:0 auto;padding:40px 22px;line-height:1.6}h1{font-size:34px;line-height:1.15}h2{margin-top:34px}a{color:inherit}small{opacity:.7}.card{border:1px solid color-mix(in srgb,currentColor 18%,transparent);border-radius:16px;padding:18px;margin:22px 0}.muted{opacity:.76}nav{display:flex;gap:16px;flex-wrap:wrap;margin:0 0 28px}
  </style>
</head>
<body>
  <nav><a href="/support">Support</a><a href="/privacy">Confidentialité</a><a href="/terms">Conditions</a></nav>
  <h1>${title}</h1>
  <p class="muted">Dernière mise à jour : 6 septembre 2026</p>
  ${body}
  <hr />
  <small>Nevi — application de traduction vocale.</small>
</body>
</html>`;
}

export function supportPage(): string {
  return page(
    'Support Nevi',
    `
    <p>Cette page est le point de support public de Nevi pour les utilisateurs de l’App Store.</p>

    <h2>Achats et abonnements</h2>
    <p>Les abonnements Nevi Pro sont facturés et gérés par Apple. Pour restaurer un abonnement déjà acheté, ouvrez le paywall Nevi puis utilisez <strong>Restaurer un achat</strong>. Pour modifier ou annuler un abonnement, utilisez les réglages Abonnements de votre compte Apple.</p>

    <h2>Problème de traduction</h2>
    <p>Vérifiez que Nevi dispose de l’autorisation Microphone, que l’appareil dispose d’une connexion Internet et que les langues source et cible sont différentes. Les enregistrements très courts ou silencieux peuvent être ignorés.</p>

    <h2>Confidentialité et données</h2>
    <p>Nevi ne demande pas de compte utilisateur. Pour comprendre les données traitées, les finalités, les prestataires et vos droits, consultez la <a href="/privacy">Politique de confidentialité</a>.</p>

    <h2>Contact</h2>
    <p>${supportContact()}</p>

    <h2>Documents</h2>
    <p><a href="/terms">Conditions d’utilisation</a> · <a href="/privacy">Politique de confidentialité</a></p>
    `
  );
}

export function termsPage(): string {
  return page(
    "Conditions d'utilisation",
    `
    <p>Les présentes conditions complètent les conditions applicables à votre achat via l’App Store. En utilisant Nevi, vous acceptez également le <a href="${APPLE_EULA}">Contrat de licence utilisateur final standard d’Apple</a> lorsque celui-ci s’applique.</p>

    <h2>Abonnements Nevi Pro</h2>
    <p>Nevi Pro est proposé sous forme d’abonnements renouvelables automatiquement, notamment hebdomadaire, mensuel ou annuel selon les offres disponibles dans votre App Store. Le prix, la devise, la durée et toute période d’essai affichés au moment de l’achat proviennent de l’App Store et prévalent sur toute autre indication.</p>
    <p>Le paiement est débité de votre compte Apple lors de la confirmation de l’achat. L’abonnement se renouvelle automatiquement sauf annulation dans les réglages de votre compte Apple avant le renouvellement. Les essais gratuits et offres introductives dépendent de l’éligibilité déterminée par Apple.</p>

    <h2>Traductions illimitées*</h2>
    <div class="card"><strong>*Usage personnel raisonnable.</strong> Nevi Pro permet un usage continu de la traduction vocale pour un usage personnel normal, dans la limite technique de <strong>${PREMIUM_DAILY_LIMIT} traductions sur toute période de 24 heures</strong> et <strong>${PREMIUM_30_DAY_LIMIT} traductions sur toute période de 30 jours</strong>. Une traduction correspond à une requête terminée avec succès.</div>
    <p>Ces limites servent à empêcher l’automatisation, le partage massif, la revente, l’extraction systématique et les usages susceptibles de dégrader le service pour les autres utilisateurs ou de générer des coûts anormaux.</p>

    <h2>Version gratuite</h2>
    <p>Une installation peut bénéficier d’un nombre limité de traductions gratuites avant qu’un abonnement Nevi Pro soit requis. Cette allocation gratuite est contrôlée côté serveur afin de limiter les contournements et abus.</p>

    <h2>Exactitude des traductions</h2>
    <p>Nevi fournit une traduction automatique. Les résultats peuvent contenir des erreurs, omissions ou ambiguïtés. Ne vous fiez pas exclusivement à Nevi pour des situations médicales, juridiques, de sécurité ou toute décision critique sans vérification humaine appropriée.</p>

    <h2>Disponibilité</h2>
    <p>Le service dépend d’Internet, de l’App Store, de RevenueCat et de fournisseurs techniques de traitement vocal et linguistique. Une disponibilité permanente et sans erreur ne peut pas être garantie.</p>

    <h2>Utilisation interdite</h2>
    <p>Il est interdit d’utiliser Nevi pour contourner les limites techniques, automatiser massivement les requêtes, revendre l’accès au service, perturber le backend, tester des identifiants ou jetons de manière abusive, ou tenter d’accéder aux clés et infrastructures privées du service.</p>

    <h2>Restauration, gestion et remboursement</h2>
    <p>Les achats peuvent être restaurés depuis l’application. La gestion, l’annulation et les demandes de remboursement sont gérées par Apple conformément aux règles de l’App Store et à la législation applicable.</p>

    <h2>Confidentialité et support</h2>
    <p>Le traitement des données est décrit dans la <a href="/privacy">Politique de confidentialité Nevi</a>. Pour l’assistance, consultez la page <a href="/support">Support Nevi</a>.</p>
    `
  );
}

export function privacyPage(): string {
  return page(
    'Politique de confidentialité',
    `
    <p>Cette politique explique les données traitées lorsque vous utilisez Nevi. Nevi ne demande pas de création de compte, d’adresse e-mail ou de mot de passe pour utiliser l’application.</p>

    <h2>Responsable du traitement</h2>
    <p>Le responsable du traitement est l’éditeur légal de Nevi identifié dans la fiche App Store et dans les informations réglementaires du fournisseur publiées par Apple. ${supportContact()}</p>

    <h2>Données traitées</h2>
    <p><strong>Audio du microphone.</strong> Lorsque vous lancez une traduction, l’audio enregistré est transmis au backend Nevi puis au fournisseur de traitement vocal/IA configuré afin de produire la transcription, la traduction et éventuellement la voix de sortie.</p>
    <p><strong>Texte transcrit et traduit.</strong> Le texte issu de l’audio et la traduction sont traités pour fournir la fonctionnalité demandée.</p>
    <p><strong>Identifiant d’installation anonyme.</strong> L’application génère un identifiant technique aléatoire utilisé pour sécuriser les requêtes, appliquer les quotas et relier l’état d’abonnement technique. Cet identifiant n’est pas un compte utilisateur et n’est pas destiné à vous identifier directement.</p>
    <p><strong>Données d’achat.</strong> RevenueCat et Apple traitent les informations nécessaires aux achats intégrés, à l’état de l’abonnement et à la restauration des achats. Nevi utilise uniquement l’état technique de l’entitlement afin d’autoriser les fonctionnalités Pro.</p>
    <p><strong>Données techniques.</strong> Le backend peut traiter l’adresse IP, des horodatages, codes d’erreur et mesures de latence nécessaires à la sécurité, à la prévention des abus et à la fiabilité du service.</p>

    <h2>Finalités et bases légales</h2>
    <p>Le traitement de l’audio, des textes et de l’état d’abonnement est nécessaire à l’exécution du service demandé et, pour Nevi Pro, à l’exécution de la relation contractuelle. Les traitements de sécurité, quotas, prévention des abus, diagnostic et fiabilité reposent sur l’intérêt légitime de l’éditeur à protéger et maintenir le service. L’accès au microphone dépend de votre autorisation iOS, que vous pouvez retirer à tout moment dans les réglages de l’appareil.</p>

    <h2>Ce que Nevi ne demande pas</h2>
    <p>Nevi ne demande pas de compte utilisateur, nom, adresse e-mail, mot de passe, liste de contacts ni profil social pour fonctionner.</p>

    <h2>Conservation</h2>
    <p>Les fichiers audio temporaires créés sur l’appareil sont supprimés après leur lecture pour l’envoi. Le backend Nevi ne journalise pas intentionnellement le contenu audio ni les transcriptions dans ses logs applicatifs.</p>
    <p>Les événements de quota Pro sont conservés au minimum pendant la fenêtre nécessaire au calcul de la limite glissante de 30 jours et peuvent ensuite être supprimés ou agrégés. Le compteur gratuit et l’identifiant d’installation peuvent être conservés plus longtemps afin de prévenir les réinitialisations abusives et assurer la continuité du service.</p>
    <p>Les prestataires techniques peuvent appliquer leurs propres durées de conservation nécessaires au fonctionnement, à la sécurité et à la prévention des abus, conformément à leurs conditions et paramètres applicables au service.</p>

    <h2>Prestataires et destinataires</h2>
    <p>Selon la configuration de production, Nevi utilise notamment Apple (App Store et achats), RevenueCat (gestion technique des abonnements), Render (hébergement backend et base de données) et un fournisseur d’IA/traitement vocal configuré côté serveur tel qu’OpenAI. Les données sont transmises uniquement lorsque cela est nécessaire à leur rôle technique.</p>

    <h2>Transferts internationaux</h2>
    <p>Certains prestataires peuvent traiter des données en dehors de l’Espace économique européen. Dans ce cas, ces transferts doivent reposer sur un mécanisme reconnu par la réglementation applicable, notamment une décision d’adéquation ou des clauses contractuelles types lorsque cela est requis.</p>

    <h2>Sécurité</h2>
    <p>Les communications avec le backend utilisent HTTPS/WSS. Les clés privées des fournisseurs IA restent côté serveur. Les requêtes de traduction nécessitent une session anonyme signée par le backend et font l’objet de limitations de fréquence et de volume.</p>

    <h2>Vos droits</h2>
    <p>Selon votre situation et la réglementation applicable, vous pouvez demander l’accès, la rectification, l’effacement, la limitation ou l’opposition au traitement de données vous concernant, ainsi que la portabilité lorsque ce droit s’applique. Comme Nevi fonctionne sans compte, certaines demandes peuvent nécessiter l’identifiant technique d’installation afin de retrouver les données correspondantes.</p>
    <p>Vous pouvez également retirer l’autorisation Microphone dans les réglages iOS, gérer ou annuler votre abonnement via Apple et restaurer vos achats depuis Nevi.</p>
    <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir l’autorité de contrôle compétente. En France, vous pouvez notamment contacter la CNIL via <a href="${CNIL_COMPLAINT}">son service de plainte</a>.</p>

    <h2>Contact et demandes relatives aux données</h2>
    <p>${supportContact()}</p>
    `
  );
}
