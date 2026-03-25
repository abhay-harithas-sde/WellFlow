import { redirect } from 'next/navigation';

// Redirect /signup (and /signup?plan=*) to the app entry point
export default function SignupPage() {
  redirect('/raw');
}
