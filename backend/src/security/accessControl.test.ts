import assert from 'node:assert/strict';
import test from 'node:test';

// Le module env exige ce secret au chargement. On le pose avant tout import.
process.env.ANONYMOUS_SESSION_SECRET ||= 'test-session-secret-long-enough';
process.env.AI_PROVIDER ||= 'device';
process.env.TTS_PROVIDER ||= 'device';

test('recordSuccessfulTranslation ne relance pas une panne du magasin de quota', async () => {
  const { recordSuccessfulTranslation, __setUsageStore } = await import(
    './accessControl'
  );

  // Magasin de quota qui échoue systématiquement, comme lors d'une panne
  // passagère de Postgres sur Render.
  __setUsageStore({
    query: async () => {
      throw new Error('connection terminated');
    },
  });

  // La traduction est déjà terminée : la comptabilité en échec doit être
  // absorbée, jamais propagée comme un échec « inconnu » vers le client. On
  // couvre les deux branches d'écriture (gratuite et premium).
  for (const premium of [false, true]) {
    await assert.doesNotReject(() =>
      recordSuccessfulTranslation('install-test', premium)
    );
  }

  __setUsageStore(null);
});
