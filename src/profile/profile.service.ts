import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Profile } from './profile.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrUpdateProfileDto } from './dto/create-update-profile.dto';
import { assignPartialObjectToEntity } from 'src/common/helpers/entity.helper';
import { EProfileJob } from './profile.interfaces';
import { appDefaultPreference } from 'src/config/app.config';
import { User } from 'src/user/user.entity';
import ApiCrud from 'src/common/helpers/api-crud';
import { TApiFeaturesDto, WithMeta } from 'src/common/interfaces/api-features';

@Injectable()
export class ProfileService extends ApiCrud<Profile> {
  constructor(
    @InjectRepository(Profile)
    private profileRepository: Repository<Profile>,
  ) {
    super(profileRepository, {
      alias: 'profile',
      autoValidateOnUD: false,
    });
  }

  validateRole(): boolean {
    return true;
  }

  triggerOnPreValidation: undefined;

  async createProfile(
    createOrUpdateProfileDto: CreateOrUpdateProfileDto,
    user: User,
  ): Promise<Profile> {
    const { position, bio, ...others } = createOrUpdateProfileDto;
    const newProfile = new Profile();

    // Set position if undefined
    // if (!position) position = EProfileJob.OTHERS;

    if (position !== EProfileJob.STUDENT) {
      delete others.studentId;
      delete others.major;
    }

    // Set bio if undefined

    assignPartialObjectToEntity(newProfile, others);
    newProfile.position = position || EProfileJob.OTHERS;
    newProfile.avatar = appDefaultPreference.DEFAULT_AVATAR;
    newProfile.bio = bio || appDefaultPreference.DEFAULT_BIO;
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

  findAllNotMe(
    username: string,
    query: TApiFeaturesDto<Profile>,
  ): Promise<WithMeta<Profile[]>> {
    return this.getManyWithMeta(query, [
      // {
      //   andWhere: `username != '${username}'`,
      // }
      {
        addFrom: 'sd'
      }
    ]);
  }

  findAll(query: TApiFeaturesDto<Profile>): Promise<WithMeta<Profile[]>> {
    return this.getManyWithMeta(query);
  }
}
