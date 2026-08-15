import { User } from './entities/user.entity';

export type PublicUser = Omit<User, 'passwordHash' | 'assignedIncidents' | 'incidentUpdates'>;

export function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, assignedIncidents, incidentUpdates, ...publicUser } =
    user;
  return publicUser;
}
