export enum Role {
  ADMIN = "ADMIN",
  AUTHOR = "AUTHOR",
  READER = "READER",
}

export interface UserProps {
  id: string;
  email: string;
  password: string; // bcrypt hash
  username: string;
  displayName: string;
  avatar: string | null;
  role: Role;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Entité domaine User - aucune dépendance framework.
 */
export class User {
  readonly id!: string;
  readonly email!: string;
  readonly password!: string;
  readonly username!: string;
  readonly displayName!: string;
  readonly avatar!: string | null;
  readonly role!: Role;
  readonly isActive!: boolean;
  readonly deletedAt!: Date | null;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;

  constructor(props: UserProps) {
    Object.assign(this, props);
  }

  isAdmin(): boolean {
    return this.role === Role.ADMIN;
  }

  isAuthor(): boolean {
    return this.role === Role.AUTHOR || this.role === Role.ADMIN;
  }

  canPublish(): boolean {
    return this.isAuthor() && this.isActive;
  }
}
