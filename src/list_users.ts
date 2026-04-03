import { executeQuery } from './lib/db';

async function listUsers() {
  try {
    const users: any = await executeQuery('SELECT username, password, nomor, grup_nama FROM mhuser WHERE status_aktif = 1');
    console.log('Active Users:', users.map((u: any) => ({ 
      username: u.username, 
      grup: u.grup_nama,
      hasPassword: !!u.password 
    })));
  } catch (err) {
    console.error('Error listing users:', err);
  }
}

listUsers();
