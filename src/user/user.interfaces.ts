export interface IEntityCreatedWithToken<T> {
  token: string;
  entity: T
}

export interface IVerificationToken {
  /**
   * Should be returned to the client
   */
  plainToken: string;

  /**
   * Should be stored in the database
   */
  hashedToken: string;
}
