import { readFile } from 'node:fs/promises';
import { redirect } from 'next/navigation';

// Rediriger vers la version statique (plus rapide, pas de problèmes JS)
export default function CartePage() {
  redirect('/carte.html');
}
