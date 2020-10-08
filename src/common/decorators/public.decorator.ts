import { SetMetadata } from '@nestjs/common';

/**
 * Allow route to be exposed without JWT Token
 * @param isPublic
 */
export const Public = (isPublic = true) => SetMetadata('isPublic', isPublic);
