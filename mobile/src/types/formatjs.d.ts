// Les paquets @formatjs n'exposent pas de types pour leurs sous-chemins.
// Ces declarations suffisent : ces imports ne servent qu'a charger le
// polyfill Intl.DisplayNames, ils n'exportent rien qu'on utilise.
declare module '@formatjs/intl-locale/polyfill';
declare module '@formatjs/intl-displaynames/polyfill';
declare module '@formatjs/intl-displaynames/locale-data/*';
