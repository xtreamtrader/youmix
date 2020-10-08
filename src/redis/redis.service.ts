import { Injectable } from '@nestjs/common';
import { createClient, RedisClient } from 'redis';
import { EPrefixKey } from './redis.interface';
import { redisConfig } from 'src/config';

@Injectable()
export class RedisService {
  private readonly client: RedisClient;

  constructor() {
    this.client = createClient(redisConfig);
  }

  /**
   * Set a string record into Redis: <user-id-with-prefix>: <execution-unix-timestamp>
   * @param userId - A user after having sensitive information updated (ex: password, role), its id will be prefixed by `USER_CREDENTIALS_CHANGED` and used as a key
   * @param expires - The duration that this record will be stored in a Redis Database (should be equal to`refreshToken.expiresIn`)
   */
  setCredentialsUserChangedByUnixTimestamp(
    userId: string,
    expires: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.SET(
        this.getKeyNameWithPrefix(EPrefixKey.USER_CREDENTIALS_CHANGED, userId),
        Math.round(new Date().getTime() / 1000) + '',
        'EX',
        expires,
        (err, reply) => {
          if (err) reject(err);

          resolve();
        },
      );
    });
  }

  /**
   * Set a string record into Redis: <token-with-prefix>: <execution-unix-timestamp
   * @param token - The accessToken that needs revoking. It will be prefixed by `TOKEN_BANNED` and used as a key
   * @param expires - The duration that this record will be stored in a Redis Database (should bethe same as `accessToken.expiresIn`)
   */
  setBannedAccessToken(token: string, expires: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.set(
        this.getKeyNameWithPrefix(EPrefixKey.TOKEN_BANNED, token),
        Math.round(new Date().getTime() / 1000) + '',
        'EX',
        expires,
        (err, reply) => {
          if (err) reject(err);
          resolve();
        },
      );
    });
  }

  /**
   * Set a string record into Redis: <hashed-token-with-prefix>: <execution-unix-timestamp
   * @param token - The accessToken that needs revoking. It will be prefixed by `TOKEN_BANNED` and used as a key
   * @param expires - The duration that this record will be stored in a Redis Database (should bethe same as `refreshToken.expiresIn`)
   */
  setUserIdWithHashedRefreshToken(
    hashedRefreshToken: string,
    userId: string,
    expires: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.set(
        this.getKeyNameWithPrefix(
          EPrefixKey.HASHED_REFRESH_TOKEN,
          hashedRefreshToken,
        ),
        userId,
        'EX',
        expires,
        (err, reply) => {
          if (err) reject(err);
          resolve();
        },
      );
    });
  }

  /**
   * Return a value of the record whose key is <user-id-with-prefix>
   * @param id - The id of user returned from DB's query
   */
  getCredentialsUserChangedByUnixTimestamp(id: string): Promise<string> {
    return this.findByKey(
      this.getKeyNameWithPrefix(EPrefixKey.USER_CREDENTIALS_CHANGED, id),
    );
  }

  /**
   * Return a value of a record whose key is <access-token-with-prefix>
   * @param accessToken - The plain access token sent from a client
   */
  getBannedAccessToken(accessToken: string): Promise<string> {
    return this.findByKey(
      this.getKeyNameWithPrefix(EPrefixKey.TOKEN_BANNED, accessToken),
    );
  }

  /**
   * Return a value of a record whose key is <hash-refresh-token-with-prefix>
   * @param hashedRefreshToken - The hashed version of plain refresh token sent from a client
   */
  getUserIdFromRefreshToken(hashedRefreshToken: string): Promise<string> {
    return this.findByKey(
      this.getKeyNameWithPrefix(
        EPrefixKey.HASHED_REFRESH_TOKEN,
        hashedRefreshToken,
      ),
    );
  }

  /**
   * Check if key is already existed in Redis
   * @param keyWithPrefix - The key after normally updated with prefix
   */
  isKeyExisted(keyWithPrefix: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.client.exists(keyWithPrefix, (err, reply) => {
        if (err) reject(err);
        resolve(reply);
      });
    });
  }

  /**
   * Return a prefixed string
   * @param prefix
   * @param str
   */
  private getKeyNameWithPrefix(prefix: EPrefixKey, str: string) {
    return `${prefix}_${str}`;
  }

  /**
   * A private method to quickly find a value of one key
   * @param key
   */
  private findByKey(key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, reply) => {
        if (err) reject(err);

        resolve(reply);
      });
    });
  }
}
