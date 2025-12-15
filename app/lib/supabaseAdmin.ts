import { supabase } from './supabaseClient';

export async function invitarUsuario(email: string, password: string) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    password
  });

  if (error) return { error };

  return { link: data.properties.action_link };
}
