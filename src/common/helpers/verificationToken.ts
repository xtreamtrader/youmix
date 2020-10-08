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
