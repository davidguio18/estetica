import * as argon2 from 'argon2';
import { Argon2PasswordHasher } from '../../src/modules/auth/infrastructure/argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  it('stores passwords as Argon2id hashes', async () => {
    const hasher = new Argon2PasswordHasher();
    const password = 'StrongPassword1';
    const hash = await hasher.hash(password);

    expect(hash).not.toBe(password);
    expect(hash).toContain('$argon2id$');
    await expect(argon2.verify(hash, password)).resolves.toBe(true);
  });
});
