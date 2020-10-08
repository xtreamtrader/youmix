import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/user.entity';
import { Repository } from 'typeorm';
import * as faker from 'faker';
import { EAccountRole } from 'src/common/interfaces/account-role.interface';
import * as bcrypt from 'bcrypt';
import {
  EProfileJob,
  EMajor,
  EAccountGender,
} from 'src/profile/profile.interfaces';
import { appDefaultPreference } from 'src/config';

// Disable due to insufficent unique data which led to duplicated results
// (faker as any).locale = 'vi';

@Injectable()
export class SeedsService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    // @InjectRepository(Profile)
    // private readonly profileRepository: Repository<Profile>,
    private readonly logger: Logger,
  ) {}

  private dummyExpertises = [
    'Marketing',
    'IT',
    'Accounting',
    'Design',
    'Sing',
    'English',
    'Speaker',
    'MC',
    'Economics',
    'Law',
    'Management',
  ];

  private dummyAchivements = [
    {
      year: 2018,
      detail: 'Obtained IELTS 8.0',
    },
    {
      year: 2018,
      detail: 'First prize in YouMix Awards 2nd Season',
    },
    {
      year: 2018,
      detail: 'Second prize in YouMix Awards 2nd Season',
    },
    {
      year: 2018,
      detail: 'Third prize in YouMix Awards 2nd Season',
    },
    {
      year: 2017,
      detail: 'Obtained IELTS 7.0',
    },
    {
      year: 2017,
      detail: 'First prize in YouMix Awards 1st Season',
    },
    {
      year: 2017,
      detail: 'Second prize in YouMix Awards 1st Season',
    },
    {
      year: 2017,
      detail: 'Third prize in YouMix Awards 1st Season',
    },
  ];

  /**
   * Return single random value from an object
   * @param o
   */
  private getRandomizedKey(o: any): string {
    const keys = Object.keys(o);
    return keys[Math.floor(Math.random() * keys.length)];
  }

  /**
   * Return a random cloned array from given array
   * @param arr
   */
  private getRandomizedChunk(arr: any[]): any[] {
    return [...arr]
      .sort(() => Math.random() - 0.5)
      .filter(() => Math.random() - 0.7 > 0);
  }

  /**
   * Seed a number of user -> profile (cascade enabled from entity level)
   * @param count
   */
  private async upUser(count: number): Promise<void> {
    const DEFAULT_PASSWORD = await bcrypt.hash('123456789', 12);

    const users = [];

    const _usedEmails = [];
    const _usedUsername = [];

    this.logger.log(`Creating ${count} users...`);
    for (let i = 0; i < count; i++) {
      let email = faker.internet.email().toLowerCase();
      let username = faker.internet.userName().toLowerCase(); // No longer need normalizing due to the switch to default locale (English)
      /*.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');*/

      while (_usedEmails.includes(email)) {
        email = faker.internet.email().toLowerCase();
      }

      while (_usedUsername.includes(username)) {
        username = faker.internet.userName().toLowerCase(); // No longer need normalizing due to the switch to default locale (English)
        /*.normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd');*/
      }

      _usedEmails.push(email);

      _usedUsername.push(username);

      users.push({
        email,
        username,
        role: EAccountRole.USER,
        status: 'SEED',
        password: DEFAULT_PASSWORD,
        profile: {
          avatar: appDefaultPreference.DEFAULT_AVATAR,
          fullname: faker.name.findName(),
          bio: faker.lorem.paragraphs(Math.floor(Math.random() * 10) + 2),
          position: EProfileJob.STUDENT,
          gender: this.getRandomizedKey(EAccountGender),
          address: faker.address.streetAddress(),
          expertises: this.getRandomizedChunk(this.dummyExpertises),
          major: this.getRandomizedKey(EMajor),
          phoneNumber: faker.phone.phoneNumber(),
          yearBorn: Math.floor(Math.random() * (2005 - 1991)) + 1990,
          achievements: this.getRandomizedChunk(this.dummyAchivements).sort(
            (a, b) => b.year - a.year,
          ),
          username,
        },
      });
    }

    this.logger.log(`...start saving...`);
    await this.userRepository.save(users);
    this.logger.debug(`Successfully seeded ${count} users`);
  }

  /**
   * Delete all seeded user -> profile rows (cascade enabled from entity level)
   */
  private async downUser(): Promise<void> {
    this.logger.log('Remove seeded users');
    const result = await this.userRepository.delete({
      status: 'SEED',
    } as any);

    this.logger.log(`Removed ${result.affected} users`);
  }

  /**
   * Seeding all entities
   * @param count
   */
  async up(count = 1000): Promise<void> {
    this.logger.log('Seeding data...');
    await this.upUser(count);
    this.logger.log('done');
  }

  /**
   * Delete all seeded rows
   */
  async down(): Promise<void> {
    this.logger.log('Removing seeding data...');
    await this.downUser();
    this.logger.log('done');
  }
}
