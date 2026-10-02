# Traduction vocale Nevi

Le mode par défaut est `TRANSLATION_MODE=realtime` avec `gpt-realtime-translate`, via la clé OpenAI existante côté serveur. Le mobile enregistre puis envoie le fichier : cette intégration ne diffuse pas encore le microphone en continu.

Le décodage vérifie le format, la durée et le silence quasi numérique. Les transcriptions finales sont drainées pendant la fermeture WebSocket. Si une session réussit sans produire de traduction sur un enregistrement audible, quelle que soit sa durée, le serveur utilise `gpt-4o-transcribe`, le modèle de traduction OpenAI configuré, puis `gpt-4o-mini-tts`. Les refus fournisseur, déconnexions et annulations ne déclenchent pas ce repli.

Retour à l’ancien fonctionnement : définir `TRANSLATION_MODE=classic` sur Render. Les paramètres AI_PROVIDER, TTS_PROVIDER et OPENAI_* antérieurs sont préservés. Aucune clé dans le mobile ni dans Git.
