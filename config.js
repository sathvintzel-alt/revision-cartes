// Clé publique (publishable) : prévue pour être exposée côté navigateur.
// Ne jamais mettre ici une clé service_role ou secret.
export const CONFIG = {
  supabaseUrl: 'https://nogulupzmoxmzdqhluwo.supabase.co',
  supabaseKey: 'sb_publishable_qiX-85ISEUTjvnZ4BFzy-g_fqFPj5lc',
  profiles: [
    { id: 'clement', name: 'Clément' },
    { id: 'samantha', name: 'Samantha' },
  ],
  defaultNewPerDay: 15,
};
