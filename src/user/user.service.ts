import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Repository } from 'typeorm';
import { AuthSignUpUserDto } from '../auth/dto/auth-signup-dto';
import * as bcrypt from 'bcrypt';
import { EAccountStatus } from 'src/common/interfaces/account-status.interface';
import { EAccountRole } from 'src/common/interfaces/account-role.interface';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { ProfileService } from 'src/profile/profile.service';
import { IEntityCreatedWithToken } from './user.interfaces';
import * as crypto from 'crypto';
import { IVerificationToken } from 'src/common/helpers/verificationToken';
import { RedisService } from 'src/redis/redis.service';
import { refreshTokenConfig } from 'src/config';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly profileService: ProfileService,
  ) {}

  /**
   * Create new account correspoding to normal user's SignUp Activity
   * @param authSignUpUserDto
   * @returns Plain verification token
   */
  async create(
    authSignUpUserDto: AuthSignUpUserDto,
  ): Promise<IEntityCreatedWithToken<User>> {
    const { username, password, email } = authSignUpUserDto;
    const { plainToken, hashedToken } = this.createVerificationToken();

    const newUser = new User();
    newUser.username = username;
    newUser.password = await this.hashPassword(password);
    newUser.status = EAccountStatus.NOTVERIFIED;
    newUser.role = EAccountRole.USER;
    newUser.email = email;
    newUser.verificationToken = hashedToken;

    try {
      // Save new user into database
      await this.userRepository.save(newUser);

      // Create correspoding Profile
      await this.profileService.createProfile({}, newUser);

      return {
        token: plainToken,
        entity: newUser,
      };
    } catch (error) {
      // If the error related to existed fields (username/email) -> throw ConflictException
      // Check for a specifc code of duplicated field
      if (error.code === '23505') {
        throw new ConflictException(
          'Either username or email has been existed. Please sign in or try again with another',
        );
      }

      console.log(error);
      // Throw InternalServerExeption for others
      throw new InternalServerErrorException();
    }
  }

  async updateUserVerificationToken(
    email: string,
  ): Promise<IEntityCreatedWithToken<User>> {
    const user = await this.findOneByEmail(email);

    const { plainToken, hashedToken } = this.createVerificationToken();

    user.verificationToken = hashedToken;

    await this.userRepository.save(user);

    return {
      entity: user,
      token: plainToken,
    };
  }
  /**
   * Get all users
   */
  async findAll(): Promise<User[]> {
    const users = await this.userRepository.find();
    return users;
  }

  /**
   * Return a single user from database whose id is equal to given id
   * @param id An unique id of each user
   */
  async findOneById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ id: id });
    if (!user) throw new NotFoundException(`No user found with id ${id}`);

    return user;
  }

  /**
   * Find one user by username
   * @param username
   */
  async findOneByUsername(username: string): Promise<User> {
    const user = await this.userRepository.findOne({ username });
    if (!user)
      throw new NotFoundException(`No user found with username ${username}`);

    return user;
  }

  async findOneByEmail(email: string): Promise<User> {
    const user = await this.userRepository.findOne({ email });
    if (!user)
      throw new NotFoundException(`No user found with username ${email}`);

    return user;
  }

  /**
   * Update non-sensitive properties for user and save to Database
   * @param id
   * @param updateUserDto
   */
  async updatePassword(
    id: string,
    { currentPassword, newPassword }: UpdateUserPasswordDto,
    loggedUser: User,
  ): Promise<void> {
    const user = await this.findOneById(id);

    if (user.role !== EAccountRole.ADMIN && user.id !== loggedUser.id)
      throw new ForbiddenException();

    if (!(await this.comparePassword(currentPassword, user.password)))
      throw new BadRequestException('Current password is not correct');

    if (currentPassword === newPassword)
      throw new BadRequestException(
        'New password must be different from current password',
      );

    user.password = await this.hashPassword(newPassword);

    await this.userRepository.save(user);
    await this.redisService.setCredentialsUserChangedByUnixTimestamp(
      user.id,
      +refreshTokenConfig.expiresIn,
    );
    return;
  }

  /**
   * Soft delete a specific User by filling current time to the column deleted_at in Database
   * @param id
   */
  async deleteOne(id: string, loggedUser: User): Promise<void> {
    const user = await this.findOneById(id);

    if (user.id !== loggedUser.id) throw new ForbiddenException();

    await this.userRepository.softDelete(user);
    return;
  }

  /**
   * Update user sensitive information with token provided
   * @param userId
   * @param token
   * @param password If password is omitted, update the account status instead
   */
  async updateUserByToken(
    userId: string,
    token: string,
    password?: string,
  ): Promise<void> {
    const user = await this.findOneById(userId);

    if (
      !user.verificationToken ||
      !this.validateVerificationToken({
        plainToken: token,
        hashedToken: user.verificationToken,
      })
    )
      throw new BadRequestException();

    if (user.status === EAccountStatus.NOTVERIFIED) {
      user.status = EAccountStatus.ACTIVE;
    } else if (password) user.password = await this.hashPassword(password);
    else throw new BadRequestException();

    user.verificationToken = null;

    await this.userRepository.save(user);
    return;
  }

  /**
   * Hash password with bcrypt
   * @param password
   */
  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  /**
   * Compare input password and hashed password
   * @param candidatePassword
   * @param hashedPassword
   */
  comparePassword(
    candidatePassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  createVerificationToken(): IVerificationToken {
    const plainToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = crypto
      .createHash('sha256')
      .update(plainToken)
      .digest('hex');

    return { plainToken, hashedToken };
  }

  validateVerificationToken({
    plainToken,
    hashedToken,
  }: IVerificationToken): boolean {
    return (
      crypto
        .createHash('sha256')
        .update(plainToken)
        .digest('hex') === hashedToken
    );
  }
}
