# Traduction vocale Nevi

Le mode par défaut est `TRANSLATION_MODE=gpt6` : transcription avec `gpt-transcribe`, traduction avec `gpt-6-sol`, puis lecture du texte avec `gpt-realtime-2.1-mini`. Les modes `realtime` et `classic` restent disponibles.

La migration audio d’octobre 2026 remplace les modèles retirés en janvier/février 2027. La transcription utilise `languages[]` pour l’indication de langue. La voix utilise une seule session Realtime, la voix `coral` et une réponse texte-vers-audio sans transcription d’entrée ni historique. Le serveur attend la réponse complète et retourne du WAV 24 kHz, déjà accepté par le mobile distribué. Il n’y a pas de seconde tentative spéculative sur ce parcours. La limite de huit secondes et le repli téléphone restent actifs ; une réponse incomplète ou sans audio n’est jamais diffusée.

Les phrases à lire sont des données, y compris lorsqu’elles contiennent des instructions ou des questions. Les essais réels doivent comparer le texte parlé retourné par le modèle au texte à lire, en plus de vérifier les octets audio. La qualité perceptuelle de la voix nécessite toujours une écoute humaine.

Le mode Realtime Translation n’est pas activé par cette migration. Son repli en cas de réponse vide utilise les nouveaux modèles audio et GPT-6. Le mode `classic`, explicitement sélectionnable par configuration, conserve ses fournisseurs et ses variables historiques ; il n’est pas invoqué implicitement par GPT-6.

Tous les modes commencent par le même contrôle serveur. FFmpeg valide et décode le fichier, un filtre acoustique rejette le silence numérique et les clics isolés, puis Silero VAD 6.2.1 distingue la parole du bruit de fond. Le modèle ONNX est livré dans `backend/models`, avec sa licence MIT et son empreinte SHA-256. Il s’exécute localement sur CPU et n’envoie aucun enregistrement à un service supplémentaire. L’état du détecteur est indépendant pour chaque requête. Le seuil minimum de parole est de 96 ms, testé avec le mot « oui » d’environ 325 ms et une voix atténuée. Une normalisation de crête limitée à un gain de 16 s’applique uniquement à la copie analysée, pour conserver les mots très courts et faibles comme « はい » ; l’audio de transcription et le seuil de probabilité de parole restent inchangés.

Sans parole, le serveur renvoie `NO_SPEECH` avant transcription, traduction, synthèse vocale ou validation d’usage. Si le détecteur est indisponible, l’appel échoue sans envoyer l’audio au modèle de transcription. Le client existant affiche déjà le message localisé et n’accorde ni XP ni jour de série à une erreur.

Le mode Realtime envoie du PCM mono 24 kHz et draine les transcriptions finales pendant la fermeture WebSocket. Une réponse Realtime vide peut utiliser le repli OpenAI uniquement après le contrôle de parole. Les refus fournisseur, déconnexions et annulations ne déclenchent pas ce repli.

Le modèle et le runtime sont épinglés ; `.npmrc` conserve uniquement les binaires CPU intégrés et empêche un téléchargement CUDA inutile. Les fichiers audio temporaires sont supprimés, y compris après rejet et annulation. Aucun secret dans Git ou le mobile.

Références : [Silero VAD](https://github.com/snakers4/silero-vad/tree/v6.2.1), [ONNX Runtime Node](https://onnxruntime.ai/docs/get-started/with-javascript/node.html), [API de transcription OpenAI](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create).
