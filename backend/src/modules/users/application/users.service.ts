import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { User } from "../domain/entities/user.entity";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../domain/repositories/user.repository.interface";

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  /** Vérifie l'unicité avant création - appelé par AuthService */
  async assertUnique(email: string, username: string): Promise<void> {
    const [emailTaken, usernameTaken] = await Promise.all([
      this.userRepository.emailExists(email),
      this.userRepository.usernameExists(username),
    ]);
    if (emailTaken) throw new ConflictException("Email already in use");
    if (usernameTaken) throw new ConflictException("Username already taken");
  }
}
