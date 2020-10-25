import {
  SelectQueryBuilder,
  Brackets,
  Repository,
  ObjectID,
  FindManyOptions,
  FindOneOptions,
  FindConditions,
  FindOperator,
} from 'typeorm';
import { TApiFeaturesDto, WithMeta } from '../interfaces/api-features';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { assignPartialObjectToEntity } from './entity.helper';
import { plainToClass } from 'class-transformer';

interface IApiCrudOptions {
  /**
   * An alias for specific table name
   */
  alias: string;

  /**
   * An array of properties which will be removed from query generated from getManyWithMeta and getManyByRelationsWithMeta
   */
  reservedFields?: string[];

  /**
   * An array of relations which is used for leftJoin operator
   */
  relations?: { prop: string; alias: string };

  /**
   * Enable auto validation on update and delete query
   * @default true
   */
  autoValidateOnUD?: boolean;

  /**
   * Enable auto transform with meta records to correspoding class defination
   * @default true
   */
  hasTransformWithMeta?: boolean;
}

interface IApiCrudValidatorOptions<T = any> {
  /**
   * Override the default autoValidationOnCUD
   */
  hasRoleValidator?: boolean;

  /**
   * An array of parameters which wil be passed into overrided validate function in derived class
   */
  validatorParams?: any[];

  /**
   * An array of parameters which will be passed into overrided triggerOnPreValidation to get entity from database
   */
  triggerParams?: any[];

  /**
   * Perform a findOne operator before execute create method
   *
   * Throw ConflictError if found
   */
  findOneBeforeCreate?: FindConditions<T>;

  /**
   * A function which will be executed before the main validate function gets called
   * Throw an error if validation failed
   */
  preValidator?: (...args: any[]) => void;

  /**
   * A function which will be executed after the main validate function gets called
   * Throw an error if validation failed
   */
  postValidator?: (...args: any[]) => void;
}

/**
 * A utility type allows passing TypeOrm' query under a single array and adding it to the SelectQueryBuilder object.
 */
export type TApiCrudQueryBuilderOption<T> = {
  [P in keyof SelectQueryBuilder<T>]?: SelectQueryBuilder<T>[P] extends (
    ...args: any
  ) => any
    ? Parameters<SelectQueryBuilder<T>[P]>[number]
    : SelectQueryBuilder<T>[P];
};

export type TQueriesToCallback<T> = (qb: SelectQueryBuilder<T>) => void;

export type TExtendFromQueries<T> =
  | TApiCrudQueryBuilderOption<T>[]
  | TQueriesToCallback<T>;

/**
 * An abstract Class for common CRUD use cases.
 *
 * Support role-validation, error handler, relations, filtering, sorting, pagination,
 * (by given query object parsed from LHS Bracket-styled URL)
 * @example /?search=xin chào các bạn&age=12&age=19&name=something&limit=20&page=1&sort=-createdAt
 */
export default abstract class ApiCrud<T> {
  /**
   * A repository from TypeOrm
   */
  private readonly repository: Repository<T>;

  /**
   * A set of rules for querying
   */
  private options: IApiCrudOptions;

  /**
   * An object for storing propertyName and its data type
   */
  private meta: Record<string, string>;

  /**
   * An alias for specific table name
   */
  private alias: string;

  /**
   * The default array of properties which will be removed from query generated from createQuery method (ex: getManyWithMeta and getManyByRelationsWithMeta)
   */
  private reservedFilterFields = ['createdAt', 'deletedAt', 'updatedAt', 'id'];

  /**
   * Default validation behavior on Update and Delete tasks
   */
  private autoValidationOnUD = true;

  private hasTransformWithMeta = true;

  private schema: new (...args: any) => T;

  constructor(repository: Repository<T>, option: IApiCrudOptions) {
    this.repository = repository;

    this.options = option;

    this.hasTransformWithMeta = option.hasTransformWithMeta;

    this.autoValidationOnUD = option.autoValidateOnUD;

    this.alias = option.alias;

    if (!this.options.reservedFields)
      this.options.reservedFields = this.reservedFilterFields;

    this.reflectMetaData();
  }

  /***********************************************************************************
   * ABSTRACT METHODS
   * *********************************************************************************
   */

  /**
   * @abstract
   * An abstract method to check for role permission.
   *
   * The value which is fetched from Database must be first in parameters
   * @param args
   */
  protected abstract validateRole(entity: T, ...args: any): boolean;

  /**
   * @abstract
   * An abstract function to get entity from database and send it to validation pipeline
   */
  protected abstract triggerOnPreValidation?(...args: any): Promise<T>;

  /***********************************************************************************
   * PROTECTED METHODS
   * *********************************************************************************
   */

  /**
   * Filter TypeOrm error to a more human-readable version
   *
   * @param error
   */
  protected filterError(error: any): void {
    if (error.name === 'QueryFailedError') {
      if (error.code === '42703' || error.code === '22P02')
        throw new BadRequestException('Invalid query paramaters');

      if ((error as any).code === '23505') {
        const errorObj = this.extractConflictErrorFromQueryBuilder(error);

        throw new ConflictException(
          `The ${this.alias} having ${this.stringifyObject(
            errorObj,
          )} been already existed`,
        );
      }

      if ((error as any).code === '23503') {
        const errorObj = this.extractConflictErrorFromQueryBuilder(error);

        throw new NotFoundException(
          `The ${this.stringifyObject(errorObj)} not found`,
        );
      }
    }
    throw error;
  }

  protected toWithMeta(
    result: [T[], number],
    queryParams: TApiFeaturesDto<T>,
  ): WithMeta<T[]> {
    return {
      data: this.hasTransformWithMeta
        ? plainToClass(this.schema, result[0])
        : result[0],
      meta: {
        currentPage: queryParams.page as any,
        limit: queryParams.limit as number,
        count: result[0].length,
        totalPage: Math.ceil(result[1] / (queryParams.limit as number)),
        totalResult: result[1],
      },
    };
  }

  /***********************************************************************************
   * PRIVATE METHODS
   * *********************************************************************************
   */

  /**
   * Retrive columns's type from Repository's metadata
   */
  private reflectMetaData() {
    this.schema = this.repository.target as any;

    const metadata = this.repository.metadata;

    this.meta = metadata.columns.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.propertyName]: cur.isArray
          ? 'array'
          : typeof cur.type === 'function'
          ? cur.type.name.toLowerCase()
          : cur.type,
      }),
      {},
    );
  }

  /**
   * Run validation (ex: Role checking) from overried `validate` and `triggerOnPreValidation` of derived class
   * @param entity
   * @param validateOptions
   */
  private async validateRoleHandler(
    entity: T,
    validateOptions: IApiCrudValidatorOptions,
  ): Promise<void> {
    if (
      validateOptions.hasRoleValidator !== undefined &&
      !validateOptions.hasRoleValidator
    )
      return;
    if (!this.autoValidationOnUD) return;

    const { preValidator, postValidator } = validateOptions;

    if (preValidator) preValidator();

    if (
      this.triggerOnPreValidation &&
      validateOptions.triggerParams?.length > 0
    ) {
      entity = await this.triggerOnPreValidation.call(
        this,
        ...validateOptions.triggerParams,
      );
    }

    if (
      !this.validateRole.call(this, entity, ...validateOptions.validatorParams)
    )
      throw new ForbiddenException();

    if (postValidator) postValidator();
  }

  /**
   * Stringify error object to a more human-readable version
   * @example { username: 'alice', address: 'lorem'} => 'username: alice, address: lorem'
   * @param obj
   */
  private stringifyObject(obj: any): string {
    return Object.keys(obj)
      .reduce(
        (acc, cur) =>
          (acc +=
            obj[cur] instanceof FindOperator
              ? `${cur}: ${obj[cur]._value}, `
              : `${cur}: ${obj[cur]}, `),
        '',
      )
      .trim()
      .slice(0, -1);
  }

  /**
   * Internal method to convert parameters from QueryBuilderError to simple-structured object
   * @param error
   */
  private extractConflictErrorFromQueryBuilder(
    error: any,
  ): Record<string, string> {
    const errorDetail = (error.detail as string).match(/\((.+?)\)/g);

    // Extract paramsName
    const paramNamePart = errorDetail[0];
    const cleanedParamNamePart = paramNamePart.substring(
      1,
      paramNamePart.length - 1,
    );
    const paramNames = cleanedParamNamePart.split(',');

    // Extract paramsValue
    const paramValuePart = errorDetail[1];
    const cleanedParamValuePart = paramValuePart.substring(
      1,
      paramValuePart.length - 1,
    );
    const paramValues = cleanedParamValuePart.split(',');

    return paramNames.reduce(
      (acc, cur, idx) => ({
        ...acc,
        [cur.trim()]: paramValues[idx].trim(),
      }),
      {},
    );
  }

  /**
   * Return a property name prefixed with defined alias option
   * @param key
   */
  private withAlias(key: string): string {
    return `${this.alias}.${key}`;
  }

  /**
   * Interal method to create a SelectQueryBuilder
   * @param queryParams
   * @param extendFromQueries
   */
  private createQuery(
    queryParams: TApiFeaturesDto<T>,
    extendFromQueries?: TExtendFromQueries<T>,
  ): SelectQueryBuilder<T> {
    const query = this.repository.createQueryBuilder(this.alias);

    this.setRelations(query);

    if (extendFromQueries) this.setExtendFromQueries(query, extendFromQueries);

    this.setFilterConditions(query, queryParams);
    this.setOrderBy(query, queryParams);
    this.setPagination(query, queryParams);
    this.setSearchParam(query, queryParams);

    return query;
  }

  /**
   * Apply an array of Queries under to SelectQueryBuilder object
   * @param query
   * @param extendFromQueries
   */
  private setExtendFromQueries(
    query: SelectQueryBuilder<T>,
    extendFromQueries: TExtendFromQueries<T>,
  ): void {
    if (Array.isArray(extendFromQueries)) {
      extendFromQueries.forEach(q => {
        const action = Object.keys(q)[0];

        query[action].call(query, q[action]);
      });
      return;
    }

    extendFromQueries.call(this, query);
  }

  /**
   * Set sort by a parameter from query: `sort=fieldName` for ascending order or `sort=-fieldName` for descending order
   * @param query
   * @param queryParams
   */
  private setOrderBy(
    query: SelectQueryBuilder<T>,
    queryParams: TApiFeaturesDto<T>,
  ) {
    // Set default Sort Option
    if (!queryParams.sort) {
      query.orderBy(this.withAlias('createdAt'), 'ASC');
      return;
    }
    if (queryParams.sort.startsWith('-')) {
      const sortFields = queryParams.sort.split('-')[1];
      query.orderBy(this.withAlias(sortFields), 'DESC');
      return;
    }

    query.orderBy(this.withAlias(queryParams.sort), 'ASC');
  }

  //TODO Add default limit options
  /**
   * Set pagination by a parameter from query: `?page=number&limit=number`
   * @param query
   * @param queryParams
   */
  private setPagination(
    query: SelectQueryBuilder<T>,
    queryParams: TApiFeaturesDto<T>,
  ) {
    let { limit = 30, page = 1 } = queryParams;

    // Convert limit to type of integer, validate for maximum value
    const _limit = parseInt(limit as string);
    limit = _limit !== NaN && _limit <= 30 ? _limit : 30;

    // Convert page to type of integer, validate for min value
    const _page = parseInt(page as string);
    page = _page !== NaN && _page > 0 ? _page : 1;

    query.skip((page - 1) * limit).take(limit);

    queryParams.limit = limit;
    queryParams.page = page;
  }

  /**
   * Apply search param on tsvector column, its query came from `?search=some thing else`
   */
  private setSearchParam(
    query: SelectQueryBuilder<T>,
    queryParams: TApiFeaturesDto<T>,
  ) {
    if (this.meta.searchWeights !== 'tsvector') return;

    const { search } = queryParams;

    const searchFieldhWithAlias = this.withAlias('searchWeights');

    if (search) {
      query
        .andWhere(
          `${searchFieldhWithAlias} @@ plainto_tsquery(unaccent('${search}'))`,
        )
        .orderBy(
          `ts_rank(${searchFieldhWithAlias}, plainto_tsquery(unaccent('${search}')))`,
          'DESC',
        );
    }
  }

  /**
   * Set filter by parameters from query: `field1=value1&field2=value2`
   */
  private setFilterConditions(
    query: SelectQueryBuilder<T>,
    queryParams: TApiFeaturesDto<T>,
  ) {
    const filters = (({ sort, limit, page, search, ...o }) => o)(queryParams);

    if (
      !filters ||
      Object.keys(filters).length === 0 ||
      (Object.keys(filters).length === 1 &&
        filters[Object.keys(filters)[0]].length === 0)
    )
      return;

    const queryBrackets = new Brackets(q => {
      Object.keys(filters).forEach((key, keyIdx) => {
        const keyWithAlias = this.withAlias(key);

        if (Array.isArray(filters[key])) {
          if (filters[key].length === 0) return;

          if (this.meta[key] === 'array') {
            q.andWhere(`${keyWithAlias} && :val_${keyIdx}`, {
              [`val_${keyIdx}`]: Array.isArray(filters[key]),
            });
            return;
          }

          const bracket = new Brackets(qb => {
            filters[key].forEach((subFilter, sfIdx) => {
              if (this.meta[key] === 'array') {
                qb.orWhere(`${keyWithAlias} && :val_${keyIdx}_${sfIdx}`, {
                  [`val_${keyIdx}_${sfIdx}`]: subFilter,
                });
                return;
              }

              if (this.meta[key] === 'jsonb') {
                return;
              }

              if (this.options.reservedFields.includes(key)) {
                return;
              }

              if (this.meta[key] === 'uuid') {
                qb.orWhere(`${keyWithAlias} = ':val_${keyIdx}_${sfIdx}'`, {
                  [`val_${keyIdx}_${sfIdx}`]: subFilter,
                });
                return;
              }

              if (this.meta[key] === 'number') {
                qb.orWhere(`${keyWithAlias} =:val_${keyIdx}_${sfIdx}`, {
                  [`val_${keyIdx}_${sfIdx}`]: subFilter,
                });
                return;
              }

              if (this.meta[key] === 'simple-array') {
                qb.orWhere(`${keyWithAlias} ILIKE '%${subFilter}%'`);
                return;
              }

              if (this.meta[key] === 'date' || this.meta[key] === 'timestamp') {
                qb.orWhere(
                  `${keyWithAlias} ::date =:val_${keyIdx}_${sfIdx} ::date`,
                  {
                    [`val_${keyIdx}_${sfIdx}`]: subFilter,
                  },
                );
                return;
              }

              qb.orWhere(`${keyWithAlias} ILIKE '${subFilter}'`);
            });
          });

          q.andWhere(bracket);
        } else {
          if (this.meta[key] === 'jsonb') {
            return;
          }

          if (this.options.reservedFields.includes(key)) {
            return;
          }

          if (this.meta[key] === 'array') {
            q.andWhere(`${keyWithAlias} && :val_${keyIdx}`, {
              [`val_${keyIdx}`]: [filters[key]],
            });
            return;
          }

          if (this.meta[key] === 'uuid') {
            q.andWhere(`${keyWithAlias} = '${filters[key]}'`);
            return;
          }

          if (this.meta[key] === 'number') {
            q.andWhere(`${keyWithAlias} = ${filters[key]}`);
            return;
          }

          if (this.meta[key] === 'simple-array') {
            q.andWhere(`${keyWithAlias} ILIKE '%${filters[key]}%'`);
            return;
          }

          if (this.meta[key] === 'date' || this.meta[key] === 'timestamp') {
            q.andWhere(`${keyWithAlias} ::date =:val_${keyIdx} ::date`, {
              [`val_${keyIdx}`]: filters[key],
            });
            return;
          }

          q.andWhere(`${keyWithAlias} ILIKE :val_${keyIdx}`, {
            [`val_${keyIdx}`]: filters[key],
          });
        }
      });
    });

    query.andWhere(new Brackets(qb => qb.where(queryBrackets)));
  }

  /**
   * Apply relation to perform join operator
   * @param query
   */
  private setRelations(query: SelectQueryBuilder<T>): void {
    if (!this.options.relations) return;

    const { prop, alias } = this.options.relations;

    query.leftJoinAndSelect(this.withAlias(prop), alias);
  }

  /***********************************************************************************
   * PUBLIC METHOD
   * *********************************************************************************
   */

  /**
   * Return the first entity that matches to the given id
   */
  public async findOneById(id: string | number | Date | ObjectID): Promise<T> {
    const record = await this.repository.findOne(id);

    if (!record)
      throw new NotFoundException(`No ${this.alias} found with id: ${id}`);

    return record;
  }

  /**
   * Return the first entity that matches to the given conditions
   */
  public async findOneByConditions(
    conditions: FindConditions<T>,
    options?: FindOneOptions<T>,
  ): Promise<T> {
    const record = await this.repository.findOne(conditions, options);

    if (!record)
      throw new NotFoundException(
        `No ${this.alias} found with ${this.stringifyObject(conditions)}`,
      );

    return record;
  }

  /**
   * Return all entities that matches to the given options
   */
  public async findByConditions(
    conditions?: FindManyOptions<T> | FindConditions<T>,
  ): Promise<T[]> {
    const result = await this.repository.find(conditions);

    if (result.length === 0) {
      throw new NotFoundException(
        `No ${this.alias} found with ${this.stringifyObject(conditions)}`,
      );
    }

    return result;
  }

  /**
   * Save new entity into Database
   */
  public async create(
    obj: Partial<T>,
    validateOptions?: IApiCrudValidatorOptions<T>,
  ): Promise<T> {
    if (validateOptions?.hasRoleValidator) {
      if (!this.triggerOnPreValidation) return;

      await this.validateRoleHandler(null, validateOptions);
    }

    try {
      if (validateOptions?.findOneBeforeCreate) {
        await this.findOneByConditions(validateOptions.findOneBeforeCreate);

        throw new ConflictException(
          `The ${this.alias} having ${this.stringifyObject(
            validateOptions.findOneBeforeCreate,
          )} been already existed`,
        );
      }

      return this.repository
        .save(obj as any)
        .catch(error => this.filterError(error));
    } catch (error) {
      if (error instanceof ConflictException) throw error;

      return this.repository
        .save(obj as any)
        .catch(error => this.filterError(error));
    }
  }

  /**
   * Update existed entity
   * @param updateDto
   * @param conditions
   * @param options
   * @param validateOptions
   */
  public async updateOneByConditions(
    updateDto: Partial<T>,
    conditions?: FindConditions<T>,
    options?: FindOneOptions<T>,
    validateOptions?: IApiCrudValidatorOptions,
  ): Promise<T> {
    const record = await this.findOneByConditions(conditions, options);

    await this.validateRoleHandler(record, validateOptions);

    const affected = assignPartialObjectToEntity(record, updateDto);

    if (affected === 0) return record;

    return this.repository.save(record).catch(error => {
      this.filterError(error);
    }) as any;
  }

  /**
   * Delete existed entity
   * @param conditions
   * @param options
   * @param validateOptions
   */
  public async deleteOneByConditions(
    conditions?: FindConditions<T>,
    options?: FindOneOptions<T>,
    validateOptions?: IApiCrudValidatorOptions,
    deleteOption?: {
      softDelete?: boolean;
    },
  ): Promise<void> {
    const record = await this.findOneByConditions(conditions, options);

    await this.validateRoleHandler(record, validateOptions);

    if (!deleteOption?.softDelete)
      return this.repository.delete(conditions).catch(this.filterError) as any;

    return this.repository
      .softDelete(conditions)
      .catch(error => this.filterError(error)) as any;
  }

  // TODO Create withMeta method
  public async getManyWithMeta(
    queryParams: TApiFeaturesDto<T>,
    extendQueries?: TExtendFromQueries<T>,
  ): Promise<WithMeta<T[]>> {
    const query = this.createQuery(queryParams, extendQueries);

    try {
      const result = await query.getManyAndCount();

      return this.toWithMeta(result, queryParams);
    } catch (error) {
      this.filterError(error);
    }
  }

  /**
   * Get many by queryParams as a condition and return a list of results with meta data for pagination purpose
   * @param queryParams
   */
  public async getManyByRelationsWithMeta(
    queryParams: TApiFeaturesDto<T>,
    extendQueries?: TExtendFromQueries<T>,
  ): Promise<WithMeta<T[]>> {
    const query = this.createQuery(queryParams, extendQueries);
    try {
      const result = await query.getManyAndCount();
      return this.toWithMeta(result, queryParams);
    } catch (error) {
      this.filterError(error);
    }
  }

  public async findOneByParamsWithDefaultRelations(
    queryParams: TApiFeaturesDto<T>,
    extendFromQueries?: TExtendFromQueries<T>,
  ): Promise<T> {
    const { limit, page, sort, search, ...conditions } = queryParams;
    const query = this.createQuery(queryParams, extendFromQueries);
    const result = await query.getOne();

    if (!result)
      throw new NotFoundException(
        `No ${this.alias} found with ${this.stringifyObject(conditions)}`,
      );

    return result;
  }
}
