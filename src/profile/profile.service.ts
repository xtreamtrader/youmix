import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository, Not, Like, Brackets } from 'typeorm';
import { Profile } from './profile.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrUpdateProfileDto } from './dto/create-update-profile.dto';
import { assignPartialObjectToEntity } from 'src/common/helpers/entity.helper';
import { EProfileJob } from './profile.interfaces';
import { appDefaultPreference } from 'src/config/app.config';
import { User } from 'src/user/user.entity';
import ApiFeature from 'src/common/helpers/apiFeatures';
import { TApiFeaturesDto, WithMeta } from 'src/common/interfaces/api-features';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {}

  async create(
    { position, bio, ...others }: CreateOrUpdateProfileDto,
    user: User,
  ): Promise<Profile> {
    const newProfile = new Profile();

    // Set position if undefined
    if (!position) position = EProfileJob.OTHERS;

    if (position !== EProfileJob.STUDENT) {
      delete others.studentId;
      delete others.major;
    }

    // Set bio if undefined
    if (!bio) bio = appDefaultPreference.DEFAULT_BIO;

    assignPartialObjectToEntity(newProfile, others);
    newProfile.position = position;
    newProfile.avatar = appDefaultPreference.DEFAULT_AVATAR;
    newProfile.bio = bio;
    newProfile.user = user;

    return this.profileRepository.save(newProfile);
  }
  async updateOne(
    createOrUpdateProfileDto: CreateOrUpdateProfileDto,
    username: string,
  ): Promise<Profile> {
    const profile = await this.findOneByName(username);

    const affected = assignPartialObjectToEntity(
      profile,
      createOrUpdateProfileDto,
    );

    // If no changes have been made, no need to resave to db
    if (affected === 0) return profile;

    return this.profileRepository.save(profile);
  }

  async findOneByName(username: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      username: username,
    });

    if (!profile) throw new NotFoundException(`Username ${username} not found`);

    return profile;
  }

  findAll(): Promise<Profile[]> {
    return this.profileRepository.find();
  }

  findAllNotMe(
    username: string,
    query: TApiFeaturesDto<Profile>,
  ): Promise<WithMeta<Profile[]>> {
    return new ApiFeature(
      this.profileRepository
        .createQueryBuilder()
        .where('username != :username ', { username }),
      query,
      {
        numericFields: ['yearBorn'],
        simpleArrayFields: ['expertises'],
        jsonbFields: ['achievements'],
      },
    ).getManyWithMeta();
  }
}
