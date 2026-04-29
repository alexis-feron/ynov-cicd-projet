import { Role, User } from "../entities/user.entity";

export interface CreateUserData {
  email: string;
  password: string; // déjà hashé
  username: string;
  displayName: string;
  role?: Role;
}

export const USER_REPOSITORY = Symbol("USER_REPOSITORY");

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(data: CreateUserData): Promise<User>;
  emailExists(email: string): Promise<boolean>;
  usernameExists(username: string): Promise<boolean>;
}
