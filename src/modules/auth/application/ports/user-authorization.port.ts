export const USER_AUTHORIZATION = Symbol('USER_AUTHORIZATION');

export interface UserAuthorizationPort {
  getPermissions(userId: string): Promise<string[]>;
}
