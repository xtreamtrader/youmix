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
import { Project } from 'src/project/project.entity';
import {
  EProjectStatus,
  EProjectMemberRole,
} from 'src/project/project.interfaces';
import { ProjectMember } from 'src/project-member/project-member.entity';
import { Profile } from 'src/profile/profile.entity';

// Disable due to insufficent unique data which led to duplicated results
// (faker as any).locale = 'vi';

@Injectable()
export class SeedsService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
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
  private getRandomizedKey(o: any, excludeKey?: string | string[]): string {
    if (!excludeKey) {
      const keys = Object.keys(o);
      return keys[Math.floor(Math.random() * keys.length)];
    }

    const clonedO = { ...o };

    if (Array.isArray(excludeKey)) excludeKey.forEach(e => delete clonedO[e]);

    if (typeof excludeKey === 'string') delete clonedO[excludeKey];

    const keys = Object.keys(clonedO);
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

  private randomInRange(min, max): number {
    return Math.floor(Math.random() * (max - min)) + min;
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

  private async upProject(count: number): Promise<void> {
    // Get random owners from db
    const owners = await this.profileRepository.find({
      where: 'random() < 0.3',
      take: count,
    });

    const projects: Project[] = [];

    const currentTimestamp = +new Date();

    const toClosingTimestamp = (currentTimestamp): number => {
      const MIN_NEGATIVE_PERIOD = 24 * 60 * 60 * 1000; // 1 Day
      const isExpires = Math.random() < 0.2;

      if (isExpires)
        return (
          currentTimestamp -
          (Math.random() * 3 * MIN_NEGATIVE_PERIOD + MIN_NEGATIVE_PERIOD)
        );

      return (
        currentTimestamp +
        (Math.random() * 10 * MIN_NEGATIVE_PERIOD + 5 * MIN_NEGATIVE_PERIOD)
      );
    };

    this.logger.log(`Creating ${owners.length} projects...`);

    for (let i = 0; i < owners.length; i++) {
      const project = new Project();
      project.name = faker.lorem.sentence();
      project.major = this.getRandomizedChunk(Object.keys(EMajor));
      project.expertises = this.getRandomizedChunk(this.dummyExpertises);
      project.description = {
        bio: faker.lorem.text(),
        summary: faker.lorem.paragraphs(),
        requirements: faker.lorem
          .sentences(Math.floor(Math.random() * 7) + 3)
          .slice(0, -1)
          .split('.'),
      };

      const _ts = toClosingTimestamp(currentTimestamp);

      project.closeAt = new Date(_ts);

      project.status = 'SEED' as any;

      const profiles = await this.profileRepository.find({
        where: `random() < 0.4 and username != '${owners[i].username}'`,
        take: this.randomInRange(15, 100),
      });

      const profileAsMembers = profiles.map(profile => ({
        role: this.getRandomizedKey(EProjectMemberRole, 'OWNER'),
        username: profile.username,
      }));

      profileAsMembers.push({
        role: EProjectMemberRole.OWNER,
        username: owners[i].username,
      });

      project.members = profileAsMembers as any;

      projects.push(project);
    }

    this.logger.log(`...start saving...`);
    await this.projectRepository.save(projects);
    this.logger.debug(`Successfully seeded ${owners.length} projects`);
  }

  private async downProject(): Promise<void> {
    this.logger.log('Remove seeded users');
    const result = await this.projectRepository.delete({
      status: 'SEED',
    } as any);

    this.logger.log(`Removed ${result.affected} projects`);
  }

  /**
   * Seeding all entities
   * @param count
   */
  async up(count = 1000): Promise<void> {
    this.logger.log('Seeding data...');
    await this.upProject(count);
    this.logger.log('done');
  }

  /**
   * Delete all seeded rows
   */
  async down(): Promise<void> {
    this.logger.log('Removing seeding data...');
    await this.downProject();
    // await this.downUser();
    this.logger.log('done');
  }
}
