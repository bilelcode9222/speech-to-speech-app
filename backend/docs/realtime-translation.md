# Traduction vocale Nevi

Le mode par défaut est `TRANSLATION_MODE=gpt6` : transcription avec `gpt-4o-transcribe`, traduction avec `gpt-6-sol`, puis voix avec `gpt-4o-mini-tts`. Les modes `realtime` et `classic` restent disponibles.

Tous les modes commencent par le même contrôle serveur. FFmpeg valide et décode le fichier, un filtre acoustique rejette le silence numérique et les clics isolés, puis Silero VAD 6.2.1 distingue la parole du bruit de fond. Le modèle ONNX est livré dans `backend/models`, avec sa licence MIT et son empreinte SHA-256. Il s’exécute localement sur CPU et n’envoie aucun enregistrement à un service supplémentaire. L’état du détecteur est indépendant pour chaque requête. Le seuil minimum de parole est de 96 ms, testé avec le mot « oui » d’environ 325 ms et une voix atténuée. Une normalisation de crête limitée à un gain de 16 s’applique uniquement à la copie analysée, pour conserver les mots très courts et faibles comme « はい » ; l’audio de transcription et le seuil de probabilité de parole restent inchangés.

Sans parole, le serveur renvoie `NO_SPEECH` avant transcription, traduction, synthèse vocale ou validation d’usage. Si le détecteur est indisponible, l’appel échoue sans envoyer l’audio au modèle de transcription. Le client existant affiche déjà le message localisé et n’accorde ni XP ni jour de série à une erreur.

Le mode Realtime envoie du PCM mono 24 kHz et draine les transcriptions finales pendant la fermeture WebSocket. Une réponse Realtime vide peut utiliser le repli OpenAI uniquement après le contrôle de parole. Les refus fournisseur, déconnexions et annulations ne déclenchent pas ce repli.

Le modèle et le runtime sont épinglés ; `.npmrc` conserve uniquement les binaires CPU intégrés et empêche un téléchargement CUDA inutile. Les fichiers audio temporaires sont supprimés, y compris après rejet et annulation. Aucun secret dans Git ou le mobile.

Références : [Silero VAD](https://github.com/snakers4/silero-vad/tree/v6.2.1), [ONNX Runtime Node](https://onnxruntime.ai/docs/get-started/with-javascript/node.html), [API de transcription OpenAI](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create).
