import { User } from '../../domain/user.entity';

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepository {
  findByUsername(username: string): Promise<User | null>;
  existsByUsername(username: string): Promise<boolean>;
  existsByEmail(email: string): Promise<boolean>;
  create(user: User): Promise<User>;
  recordFailedLogin(user: User): Promise<void>;
  recordSuccessfulLogin(user: User, loggedInAt: Date): Promise<User>;
  findById(id: string): Promise<User | null>;
}
