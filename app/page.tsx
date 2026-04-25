import { redirect } from 'next/navigation';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export default async function Home() {
  const session = await getServerSessionFirebase();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/landing');
  }
}

