import {
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Replace each field in target by its value from source
 * @param target
 * @param source
 * @returns Affected fields
 */
export function assignPartialObjectToEntity<T>(
  target: T,
  source: Partial<T>,
): number {
  if (!source || !Object.keys(source).length) return 0;
  let affected = 0;
  Object.keys(source).forEach(key => {
    target[key] = source[key];
    affected++;
  });

  return affected;
}

export function BaseModel<T extends boolean>(
  withId?: T,
): T extends true ? CTor<BaseEntityWithId> : CTor<BaseEntity>;

export function BaseModel<T extends boolean>(
  withId?: T,
): CTor<BaseEntityWithId> | CTor<BaseEntity> {
  if (withId) return BaseEntityWithId;
  return BaseEntity;
}

export class BaseEntityWithId {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

export class BaseEntity {
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}

export type CTor<T> = new (...args: any[]) => T;
