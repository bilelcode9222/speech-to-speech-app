Audio fixtures are synthetic test speech from Nevi's existing local translation
smoke tests (macOS text-to-speech), converted to mono PCM16 at 16 kHz with FFmpeg.

- `short-oui.wav`: French “Oui”, about 325 ms.
- `short-hai.wav`: Japanese “はい” (yes), Kyoko voice; regression for quiet short words.
- `spanish-sentence.wav`: a full Spanish test sentence.

Silence, stationary noise and microphone clicks are generated deterministically
inside the tests. No user microphone recording is stored here.
