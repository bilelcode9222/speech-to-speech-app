export interface PaywallCopy {
  close: string;
  headlineLine1: string;
  headlineLine2: string;
  subtitle: string;
  yearly: string;
  monthly: string;
  weekly: string;
  priceUnavailable: string;
  loadingPrices: string;
  subscriptionUnavailableTitle: string;
  purchasesUnavailableBody: string;
  pricesUnavailableBody: string;
  purchaseFailedTitle: string;
  purchaseFailedBody: string;
  restoreUnavailableTitle: string;
  restoreSuccessTitle: string;
  restoreSuccessBody: string;
  noSubscriptionTitle: string;
  noSubscriptionBody: string;
  restoreFailedTitle: string;
  restoreFailedBody: string;
  continueLabel: string;
  tryFreeTemplate: string;
  then: string;
  autoRenew: string;
  conditionsUnavailable: string;
  fairUseTemplate: string;
  restorePurchase: string;
  unlimitedTranslations: string;
  travel: string;
  faceToFace: string;
  naturalVoice: string;
  terms: string;
  privacy: string;
  restore: string;
  perYear: string;
  perMonth: string;
  perWeek: string;
  approxPerMonth: string;
  freeTrialTemplate: string;
  day: [string, string];
  week: [string, string];
  month: [string, string];
  year: [string, string];
}

const en: PaywallCopy = {
  close: 'Close',
  headlineLine1: 'Every language,',
  headlineLine2: 'live.',
  subtitle: 'Unlimited voice translation*, face-to-face mode, natural voice and more.',
  yearly: 'Yearly', monthly: 'Monthly', weekly: 'Weekly',
  priceUnavailable: 'App Store price unavailable',
  loadingPrices: 'Checking App Store prices…',
  subscriptionUnavailableTitle: 'Subscription unavailable',
  purchasesUnavailableBody: 'Purchases are not available in this version of Nevi.',
  pricesUnavailableBody: 'App Store prices are not available right now. Please try again shortly.',
  purchaseFailedTitle: 'Purchase failed',
  purchaseFailedBody: 'The purchase could not be completed. Please try again shortly.',
  restoreUnavailableTitle: 'Restore unavailable',
  restoreSuccessTitle: 'Purchase restored',
  restoreSuccessBody: 'Nevi Pro is now active.',
  noSubscriptionTitle: 'No subscription found',
  noSubscriptionBody: 'No active Nevi Pro subscription was found for this Apple account.',
  restoreFailedTitle: 'Restore failed',
  restoreFailedBody: 'Purchases cannot be restored right now.',
  continueLabel: 'Continue',
  tryFreeTemplate: 'Try {trial} free',
  then: 'Then',
  autoRenew: 'Auto-renewing subscription. Cancel anytime.',
  conditionsUnavailable: 'Subscription prices and terms will appear as soon as they are available from the App Store.',
  fairUseTemplate: '*Fair personal use: up to {daily} translations in 24 hours and {monthly} in 30 days.',
  restorePurchase: 'Restore purchase',
  unlimitedTranslations: 'Unlimited translations*',
  travel: 'Translate while traveling',
  faceToFace: 'Face-to-face mode',
  naturalVoice: 'Natural voice',
  terms: 'Terms', privacy: 'Privacy', restore: 'Restore',
  perYear: '/ year', perMonth: '/ month', perWeek: '/ week', approxPerMonth: '≈ {price} / month',
  freeTrialTemplate: '{count} {unit} free trial',
  day: ['day', 'days'], week: ['week', 'weeks'], month: ['month', 'months'], year: ['year', 'years'],
};

const fr: PaywallCopy = {
  close: 'Fermer',
  headlineLine1: 'Chaque langue,',
  headlineLine2: 'en direct.',
  subtitle: 'Traduction vocale illimitée*, mode face à face, voix naturelle et bien plus encore.',
  yearly: 'Annuel', monthly: 'Mensuel', weekly: 'Hebdomadaire',
  priceUnavailable: 'Prix App Store indisponible',
  loadingPrices: 'Vérification des prix App Store…',
  subscriptionUnavailableTitle: 'Abonnement indisponible',
  purchasesUnavailableBody: 'Les achats ne sont pas disponibles dans cette version de Nevi.',
  pricesUnavailableBody: 'Les prix App Store ne sont pas disponibles pour le moment. Réessaie dans quelques instants.',
  purchaseFailedTitle: 'Achat impossible',
  purchaseFailedBody: 'L’achat n’a pas pu être finalisé. Réessaie dans quelques instants.',
  restoreUnavailableTitle: 'Restauration indisponible',
  restoreSuccessTitle: 'Achat restauré',
  restoreSuccessBody: 'Nevi Pro est maintenant actif.',
  noSubscriptionTitle: 'Aucun abonnement trouvé',
  noSubscriptionBody: 'Aucun abonnement Nevi Pro actif n’a été trouvé sur ce compte Apple.',
  restoreFailedTitle: 'Restauration impossible',
  restoreFailedBody: 'Impossible de restaurer les achats pour le moment.',
  continueLabel: 'Continuer',
  tryFreeTemplate: 'Essayer {trial} gratuitement',
  then: 'Puis',
  autoRenew: 'Abonnement automatique. Annulable à tout moment.',
  conditionsUnavailable: 'Les prix et conditions d’abonnement seront affichés dès qu’ils seront disponibles depuis l’App Store.',
  fairUseTemplate: '*Usage personnel raisonnable : jusqu’à {daily} traductions sur 24 h et {monthly} sur 30 jours.',
  restorePurchase: 'Restaurer un achat',
  unlimitedTranslations: 'Traductions illimitées*',
  travel: 'Traduisez en voyage',
  faceToFace: 'Mode face à face',
  naturalVoice: 'Voix naturelle',
  terms: 'Conditions', privacy: 'Confidentialité', restore: 'Restaurer',
  perYear: '/ an', perMonth: '/ mois', perWeek: '/ semaine', approxPerMonth: '≈ {price} / mois',
  freeTrialTemplate: '{count} {unit} d’essai gratuit',
  day: ['jour', 'jours'], week: ['semaine', 'semaines'], month: ['mois', 'mois'], year: ['an', 'ans'],
};

const es: PaywallCopy = {
  close: 'Cerrar', headlineLine1: 'Cada idioma,', headlineLine2: 'en directo.',
  subtitle: 'Traducción de voz ilimitada*, modo cara a cara, voz natural y mucho más.',
  yearly: 'Anual', monthly: 'Mensual', weekly: 'Semanal', priceUnavailable: 'Precio de App Store no disponible',
  loadingPrices: 'Comprobando precios de App Store…', subscriptionUnavailableTitle: 'Suscripción no disponible',
  purchasesUnavailableBody: 'Las compras no están disponibles en esta versión de Nevi.', pricesUnavailableBody: 'Los precios de App Store no están disponibles ahora. Inténtalo de nuevo en unos instantes.',
  purchaseFailedTitle: 'Compra fallida', purchaseFailedBody: 'No se pudo completar la compra. Inténtalo de nuevo en unos instantes.',
  restoreUnavailableTitle: 'Restauración no disponible', restoreSuccessTitle: 'Compra restaurada', restoreSuccessBody: 'Nevi Pro ya está activo.',
  noSubscriptionTitle: 'No se encontró ninguna suscripción', noSubscriptionBody: 'No se encontró ninguna suscripción activa de Nevi Pro en esta cuenta de Apple.',
  restoreFailedTitle: 'No se pudo restaurar', restoreFailedBody: 'No se pueden restaurar las compras en este momento.', continueLabel: 'Continuar', tryFreeTemplate: 'Prueba {trial} gratis', then: 'Después',
  autoRenew: 'Suscripción con renovación automática. Cancela cuando quieras.', conditionsUnavailable: 'Los precios y condiciones aparecerán cuando estén disponibles en App Store.',
  fairUseTemplate: '*Uso personal razonable: hasta {daily} traducciones en 24 horas y {monthly} en 30 días.', restorePurchase: 'Restaurar compra', unlimitedTranslations: 'Traducciones ilimitadas*', travel: 'Traduce mientras viajas', faceToFace: 'Modo cara a cara', naturalVoice: 'Voz natural', terms: 'Términos', privacy: 'Privacidad', restore: 'Restaurar',
  perYear: '/ año', perMonth: '/ mes', perWeek: '/ semana', approxPerMonth: '≈ {price} / mes', freeTrialTemplate: '{count} {unit} de prueba gratis', day: ['día','días'], week: ['semana','semanas'], month: ['mes','meses'], year: ['año','años'],
};

const de: PaywallCopy = {
  close: 'Schließen', headlineLine1: 'Jede Sprache,', headlineLine2: 'live.', subtitle: 'Unbegrenzte Sprachübersetzung*, Gegenüber-Modus, natürliche Stimme und mehr.', yearly: 'Jährlich', monthly: 'Monatlich', weekly: 'Wöchentlich', priceUnavailable: 'App-Store-Preis nicht verfügbar', loadingPrices: 'App-Store-Preise werden geprüft…', subscriptionUnavailableTitle: 'Abo nicht verfügbar', purchasesUnavailableBody: 'Käufe sind in dieser Version von Nevi nicht verfügbar.', pricesUnavailableBody: 'App-Store-Preise sind derzeit nicht verfügbar. Bitte versuche es gleich noch einmal.', purchaseFailedTitle: 'Kauf fehlgeschlagen', purchaseFailedBody: 'Der Kauf konnte nicht abgeschlossen werden. Bitte versuche es erneut.', restoreUnavailableTitle: 'Wiederherstellung nicht verfügbar', restoreSuccessTitle: 'Kauf wiederhergestellt', restoreSuccessBody: 'Nevi Pro ist jetzt aktiv.', noSubscriptionTitle: 'Kein Abo gefunden', noSubscriptionBody: 'Für dieses Apple-Konto wurde kein aktives Nevi-Pro-Abo gefunden.', restoreFailedTitle: 'Wiederherstellung fehlgeschlagen', restoreFailedBody: 'Käufe können derzeit nicht wiederhergestellt werden.', continueLabel: 'Weiter', tryFreeTemplate: '{trial} kostenlos testen', then: 'Danach', autoRenew: 'Automatisch verlängerndes Abo. Jederzeit kündbar.', conditionsUnavailable: 'Preise und Abo-Bedingungen werden angezeigt, sobald sie im App Store verfügbar sind.', fairUseTemplate: '*Angemessene persönliche Nutzung: bis zu {daily} Übersetzungen in 24 Stunden und {monthly} in 30 Tagen.', restorePurchase: 'Kauf wiederherstellen', unlimitedTranslations: 'Unbegrenzte Übersetzungen*', travel: 'Auf Reisen übersetzen', faceToFace: 'Gegenüber-Modus', naturalVoice: 'Natürliche Stimme', terms: 'Bedingungen', privacy: 'Datenschutz', restore: 'Wiederherstellen', perYear: '/ Jahr', perMonth: '/ Monat', perWeek: '/ Woche', approxPerMonth: '≈ {price} / Monat', freeTrialTemplate: '{count} {unit} kostenlos testen', day: ['Tag','Tage'], week: ['Woche','Wochen'], month: ['Monat','Monate'], year: ['Jahr','Jahre'],
};

const it: PaywallCopy = {
  close: 'Chiudi', headlineLine1: 'Ogni lingua,', headlineLine2: 'in diretta.', subtitle: 'Traduzione vocale illimitata*, modalità faccia a faccia, voce naturale e molto altro.', yearly: 'Annuale', monthly: 'Mensile', weekly: 'Settimanale', priceUnavailable: 'Prezzo App Store non disponibile', loadingPrices: 'Verifica dei prezzi App Store…', subscriptionUnavailableTitle: 'Abbonamento non disponibile', purchasesUnavailableBody: 'Gli acquisti non sono disponibili in questa versione di Nevi.', pricesUnavailableBody: 'I prezzi App Store non sono disponibili al momento. Riprova tra poco.', purchaseFailedTitle: 'Acquisto non riuscito', purchaseFailedBody: 'Non è stato possibile completare l’acquisto. Riprova tra poco.', restoreUnavailableTitle: 'Ripristino non disponibile', restoreSuccessTitle: 'Acquisto ripristinato', restoreSuccessBody: 'Nevi Pro è ora attivo.', noSubscriptionTitle: 'Nessun abbonamento trovato', noSubscriptionBody: 'Nessun abbonamento Nevi Pro attivo è stato trovato su questo account Apple.', restoreFailedTitle: 'Ripristino non riuscito', restoreFailedBody: 'Impossibile ripristinare gli acquisti in questo momento.', continueLabel: 'Continua', tryFreeTemplate: 'Prova {trial} gratis', then: 'Poi', autoRenew: 'Abbonamento con rinnovo automatico. Annullabile in qualsiasi momento.', conditionsUnavailable: 'Prezzi e condizioni appariranno non appena disponibili su App Store.', fairUseTemplate: '*Uso personale ragionevole: fino a {daily} traduzioni in 24 ore e {monthly} in 30 giorni.', restorePurchase: 'Ripristina acquisto', unlimitedTranslations: 'Traduzioni illimitate*', travel: 'Traduci in viaggio', faceToFace: 'Modalità faccia a faccia', naturalVoice: 'Voce naturale', terms: 'Termini', privacy: 'Privacy', restore: 'Ripristina', perYear: '/ anno', perMonth: '/ mese', perWeek: '/ settimana', approxPerMonth: '≈ {price} / mese', freeTrialTemplate: '{count} {unit} di prova gratuita', day: ['giorno','giorni'], week: ['settimana','settimane'], month: ['mese','mesi'], year: ['anno','anni'],
};

const pt: PaywallCopy = {
  close: 'Fechar', headlineLine1: 'Cada idioma,', headlineLine2: 'ao vivo.', subtitle: 'Tradução por voz ilimitada*, modo frente a frente, voz natural e muito mais.', yearly: 'Anual', monthly: 'Mensal', weekly: 'Semanal', priceUnavailable: 'Preço da App Store indisponível', loadingPrices: 'Verificando preços da App Store…', subscriptionUnavailableTitle: 'Assinatura indisponível', purchasesUnavailableBody: 'As compras não estão disponíveis nesta versão do Nevi.', pricesUnavailableBody: 'Os preços da App Store não estão disponíveis agora. Tente novamente em instantes.', purchaseFailedTitle: 'Compra não concluída', purchaseFailedBody: 'Não foi possível concluir a compra. Tente novamente em instantes.', restoreUnavailableTitle: 'Restauração indisponível', restoreSuccessTitle: 'Compra restaurada', restoreSuccessBody: 'Nevi Pro está ativo agora.', noSubscriptionTitle: 'Nenhuma assinatura encontrada', noSubscriptionBody: 'Nenhuma assinatura Nevi Pro ativa foi encontrada nesta conta Apple.', restoreFailedTitle: 'Falha ao restaurar', restoreFailedBody: 'Não é possível restaurar compras no momento.', continueLabel: 'Continuar', tryFreeTemplate: 'Teste {trial} grátis', then: 'Depois', autoRenew: 'Assinatura com renovação automática. Cancele quando quiser.', conditionsUnavailable: 'Preços e condições aparecerão quando estiverem disponíveis na App Store.', fairUseTemplate: '*Uso pessoal razoável: até {daily} traduções em 24 horas e {monthly} em 30 dias.', restorePurchase: 'Restaurar compra', unlimitedTranslations: 'Traduções ilimitadas*', travel: 'Traduza em viagens', faceToFace: 'Modo frente a frente', naturalVoice: 'Voz natural', terms: 'Termos', privacy: 'Privacidade', restore: 'Restaurar', perYear: '/ ano', perMonth: '/ mês', perWeek: '/ semana', approxPerMonth: '≈ {price} / mês', freeTrialTemplate: '{count} {unit} de teste grátis', day: ['dia','dias'], week: ['semana','semanas'], month: ['mês','meses'], year: ['ano','anos'],
};

const nl: PaywallCopy = {
  close: 'Sluiten', headlineLine1: 'Elke taal,', headlineLine2: 'live.', subtitle: 'Onbeperkte spraakvertaling*, face-to-face-modus, natuurlijke stem en meer.', yearly: 'Jaarlijks', monthly: 'Maandelijks', weekly: 'Wekelijks', priceUnavailable: 'App Store-prijs niet beschikbaar', loadingPrices: 'App Store-prijzen controleren…', subscriptionUnavailableTitle: 'Abonnement niet beschikbaar', purchasesUnavailableBody: 'Aankopen zijn niet beschikbaar in deze versie van Nevi.', pricesUnavailableBody: 'App Store-prijzen zijn momenteel niet beschikbaar. Probeer het zo opnieuw.', purchaseFailedTitle: 'Aankoop mislukt', purchaseFailedBody: 'De aankoop kon niet worden voltooid. Probeer het opnieuw.', restoreUnavailableTitle: 'Herstellen niet beschikbaar', restoreSuccessTitle: 'Aankoop hersteld', restoreSuccessBody: 'Nevi Pro is nu actief.', noSubscriptionTitle: 'Geen abonnement gevonden', noSubscriptionBody: 'Er is geen actief Nevi Pro-abonnement gevonden voor dit Apple-account.', restoreFailedTitle: 'Herstellen mislukt', restoreFailedBody: 'Aankopen kunnen momenteel niet worden hersteld.', continueLabel: 'Doorgaan', tryFreeTemplate: 'Probeer {trial} gratis', then: 'Daarna', autoRenew: 'Automatisch verlengend abonnement. Altijd opzegbaar.', conditionsUnavailable: 'Prijzen en voorwaarden verschijnen zodra ze beschikbaar zijn in de App Store.', fairUseTemplate: '*Redelijk persoonlijk gebruik: maximaal {daily} vertalingen in 24 uur en {monthly} in 30 dagen.', restorePurchase: 'Aankoop herstellen', unlimitedTranslations: 'Onbeperkte vertalingen*', travel: 'Vertaal onderweg', faceToFace: 'Face-to-face-modus', naturalVoice: 'Natuurlijke stem', terms: 'Voorwaarden', privacy: 'Privacy', restore: 'Herstellen', perYear: '/ jaar', perMonth: '/ maand', perWeek: '/ week', approxPerMonth: '≈ {price} / maand', freeTrialTemplate: '{count} {unit} gratis proberen', day: ['dag','dagen'], week: ['week','weken'], month: ['maand','maanden'], year: ['jaar','jaar'],
};

const ru: PaywallCopy = {
  close: 'Закрыть', headlineLine1: 'Любой язык,', headlineLine2: 'вживую.', subtitle: 'Безлимитный голосовой перевод*, режим лицом к лицу, естественный голос и многое другое.', yearly: 'Годовой', monthly: 'Месячный', weekly: 'Недельный', priceUnavailable: 'Цена App Store недоступна', loadingPrices: 'Проверяем цены App Store…', subscriptionUnavailableTitle: 'Подписка недоступна', purchasesUnavailableBody: 'Покупки недоступны в этой версии Nevi.', pricesUnavailableBody: 'Цены App Store сейчас недоступны. Попробуйте ещё раз через несколько минут.', purchaseFailedTitle: 'Покупка не выполнена', purchaseFailedBody: 'Не удалось завершить покупку. Попробуйте ещё раз.', restoreUnavailableTitle: 'Восстановление недоступно', restoreSuccessTitle: 'Покупка восстановлена', restoreSuccessBody: 'Nevi Pro теперь активен.', noSubscriptionTitle: 'Подписка не найдена', noSubscriptionBody: 'Для этой учётной записи Apple не найдена активная подписка Nevi Pro.', restoreFailedTitle: 'Не удалось восстановить', restoreFailedBody: 'Сейчас невозможно восстановить покупки.', continueLabel: 'Продолжить', tryFreeTemplate: 'Попробовать {trial} бесплатно', then: 'Затем', autoRenew: 'Автопродлеваемая подписка. Отмена в любое время.', conditionsUnavailable: 'Цены и условия появятся, когда станут доступны в App Store.', fairUseTemplate: '*Разумное личное использование: до {daily} переводов за 24 часа и {monthly} за 30 дней.', restorePurchase: 'Восстановить покупку', unlimitedTranslations: 'Безлимитные переводы*', travel: 'Переводите в поездках', faceToFace: 'Режим лицом к лицу', naturalVoice: 'Естественный голос', terms: 'Условия', privacy: 'Конфиденциальность', restore: 'Восстановить', perYear: '/ год', perMonth: '/ месяц', perWeek: '/ неделю', approxPerMonth: '≈ {price} / месяц', freeTrialTemplate: '{count} {unit} бесплатно', day: ['день','дней'], week: ['неделя','недель'], month: ['месяц','месяцев'], year: ['год','лет'],
};

const ar: PaywallCopy = {
  close: 'إغلاق', headlineLine1: 'كل لغة،', headlineLine2: 'مباشرة.', subtitle: 'ترجمة صوتية غير محدودة*، وضع وجهًا لوجه، صوت طبيعي والمزيد.', yearly: 'سنوي', monthly: 'شهري', weekly: 'أسبوعي', priceUnavailable: 'سعر App Store غير متاح', loadingPrices: 'جارٍ التحقق من أسعار App Store…', subscriptionUnavailableTitle: 'الاشتراك غير متاح', purchasesUnavailableBody: 'المشتريات غير متاحة في هذا الإصدار من Nevi.', pricesUnavailableBody: 'أسعار App Store غير متاحة حاليًا. حاول مرة أخرى بعد قليل.', purchaseFailedTitle: 'تعذر الشراء', purchaseFailedBody: 'تعذر إكمال عملية الشراء. حاول مرة أخرى بعد قليل.', restoreUnavailableTitle: 'الاستعادة غير متاحة', restoreSuccessTitle: 'تمت استعادة الشراء', restoreSuccessBody: 'Nevi Pro مفعّل الآن.', noSubscriptionTitle: 'لم يتم العثور على اشتراك', noSubscriptionBody: 'لم يتم العثور على اشتراك Nevi Pro نشط لهذا الحساب في Apple.', restoreFailedTitle: 'تعذرت الاستعادة', restoreFailedBody: 'لا يمكن استعادة المشتريات الآن.', continueLabel: 'متابعة', tryFreeTemplate: 'جرّب {trial} مجانًا', then: 'ثم', autoRenew: 'اشتراك يتجدد تلقائيًا. يمكنك الإلغاء في أي وقت.', conditionsUnavailable: 'ستظهر الأسعار والشروط عند توفرها من App Store.', fairUseTemplate: '*استخدام شخصي معقول: حتى {daily} ترجمة خلال 24 ساعة و{monthly} خلال 30 يومًا.', restorePurchase: 'استعادة الشراء', unlimitedTranslations: 'ترجمات غير محدودة*', travel: 'ترجم أثناء السفر', faceToFace: 'وضع وجهًا لوجه', naturalVoice: 'صوت طبيعي', terms: 'الشروط', privacy: 'الخصوصية', restore: 'استعادة', perYear: '/ سنة', perMonth: '/ شهر', perWeek: '/ أسبوع', approxPerMonth: '≈ {price} / شهر', freeTrialTemplate: 'تجربة مجانية لمدة {count} {unit}', day: ['يوم','أيام'], week: ['أسبوع','أسابيع'], month: ['شهر','أشهر'], year: ['سنة','سنوات'],
};

const zh: PaywallCopy = {
  close: '关闭', headlineLine1: '每种语言，', headlineLine2: '实时翻译。', subtitle: '无限语音翻译*、面对面模式、自然语音等更多功能。', yearly: '年度', monthly: '月度', weekly: '每周', priceUnavailable: 'App Store 价格不可用', loadingPrices: '正在检查 App Store 价格…', subscriptionUnavailableTitle: '订阅不可用', purchasesUnavailableBody: '此版本的 Nevi 暂不支持购买。', pricesUnavailableBody: '当前无法获取 App Store 价格，请稍后重试。', purchaseFailedTitle: '购买失败', purchaseFailedBody: '无法完成购买，请稍后重试。', restoreUnavailableTitle: '无法恢复购买', restoreSuccessTitle: '购买已恢复', restoreSuccessBody: 'Nevi Pro 现已启用。', noSubscriptionTitle: '未找到订阅', noSubscriptionBody: '此 Apple 账户没有有效的 Nevi Pro 订阅。', restoreFailedTitle: '恢复失败', restoreFailedBody: '当前无法恢复购买。', continueLabel: '继续', tryFreeTemplate: '免费试用 {trial}', then: '之后', autoRenew: '自动续订，可随时取消。', conditionsUnavailable: 'App Store 提供后将显示订阅价格和条款。', fairUseTemplate: '*合理个人使用：24 小时内最多 {daily} 次翻译，30 天内最多 {monthly} 次。', restorePurchase: '恢复购买', unlimitedTranslations: '无限翻译*', travel: '旅行时翻译', faceToFace: '面对面模式', naturalVoice: '自然语音', terms: '条款', privacy: '隐私', restore: '恢复', perYear: '/ 年', perMonth: '/ 月', perWeek: '/ 周', approxPerMonth: '≈ {price} / 月', freeTrialTemplate: '免费试用 {count} {unit}', day: ['天','天'], week: ['周','周'], month: ['个月','个月'], year: ['年','年'],
};

const ja: PaywallCopy = {
  close: '閉じる', headlineLine1: 'すべての言語を、', headlineLine2: 'リアルタイムで。', subtitle: '音声翻訳が無制限*、対面モード、自然な音声など。', yearly: '年間', monthly: '月間', weekly: '週間', priceUnavailable: 'App Storeの価格を取得できません', loadingPrices: 'App Storeの価格を確認中…', subscriptionUnavailableTitle: 'サブスクリプションを利用できません', purchasesUnavailableBody: 'このバージョンのNeviでは購入を利用できません。', pricesUnavailableBody: '現在App Storeの価格を取得できません。しばらくしてからもう一度お試しください。', purchaseFailedTitle: '購入できませんでした', purchaseFailedBody: '購入を完了できませんでした。もう一度お試しください。', restoreUnavailableTitle: '復元を利用できません', restoreSuccessTitle: '購入を復元しました', restoreSuccessBody: 'Nevi Proが有効になりました。', noSubscriptionTitle: 'サブスクリプションが見つかりません', noSubscriptionBody: 'このAppleアカウントに有効なNevi Proサブスクリプションはありません。', restoreFailedTitle: '復元できませんでした', restoreFailedBody: '現在購入を復元できません。', continueLabel: '続ける', tryFreeTemplate: '{trial}を無料で試す', then: 'その後', autoRenew: '自動更新サブスクリプション。いつでもキャンセルできます。', conditionsUnavailable: 'App Storeで利用可能になり次第、価格と条件を表示します。', fairUseTemplate: '*個人の適正利用：24時間で最大{daily}回、30日で最大{monthly}回の翻訳。', restorePurchase: '購入を復元', unlimitedTranslations: '翻訳無制限*', travel: '旅行中も翻訳', faceToFace: '対面モード', naturalVoice: '自然な音声', terms: '利用規約', privacy: 'プライバシー', restore: '復元', perYear: '/ 年', perMonth: '/ 月', perWeek: '/ 週', approxPerMonth: '≈ {price} / 月', freeTrialTemplate: '{count}{unit}無料トライアル', day: ['日','日'], week: ['週間','週間'], month: ['か月','か月'], year: ['年','年'],
};

const COPIES: Record<string, PaywallCopy> = { en, fr, es, de, it, pt, nl, ru, ar, zh, ja };

export function getPaywallCopy(locale: string): PaywallCopy {
  return COPIES[locale] ?? en;
}

export function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
