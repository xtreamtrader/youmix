/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  SelectQueryBuilder,
  Brackets,
  Repository,
  ObjectID,
  FindManyOptions,
  FindOneOptions,
  FindConditions,
  FindOperator,
  EntitySchema,
  OrderByCondition,
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
import { DriverUtils } from 'typeorm/driver/DriverUtils';
import { Profile } from 'src/profile/profile.entity';

interface IRelation {
  prop: string;
  alias: string;
  nestedRelation?: Omit<IRelation, 'nestedRelation'>[];
}

interface IApiCrudOptions {
  /**
   * An alias for specific table name
   */
  alias: string;

  /**
   * An array of column name which is not prefixed with default alias setting
   */
  excludeAlias?: string[];

  /**
   * An array of properties which will be removed from query generated from getManyWithMeta and getManyByRelationsWithMeta
   */
  reservedFields?: string[];

  /**
   * An array of relations which is used for leftJoin operator
   */
  relations?: IRelation | IRelation[];

  /**
   * Optional search path on relation
   */
  searchOnRelation?: string;

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

interface IApiCrudValidatorOptions<
  T = any,
  K extends IBaseValidatorContext<T> = any,
  V extends IBaseTriggerOnPreValidationContext = any
> {
  /**
   * Override the default autoValidationOnCUD
   */
  hasRoleValidator?: boolean;

  /**
   * An array of parameters which wil be passed into overrided validate function in derived class
   */
  validatorContext?: Omit<K, 'entity'>;

  /**
   * An array of parameters which will be passed into overrided triggerOnPreValidation to get entity from database
   */
  triggerContext?: V;

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
  preValidator?: () => Promise<void> | void;

  /**
   * A function which will be executed after the main validate function gets called
   * Throw an error if validation failed
   */
  postValidator?: (entity?: T) => Promise<void> | void;
}

interface IRelationExposedLevel {
  include?: string[];
  exclude?: string[];
}
interface ICreateFindOne {
  findOne?: boolean;
}

interface IPaginationOnRoot {
  /**
   * Create a nested subquery from-clause to limit records on the parent
   */
  usePaginationOnParent?: boolean;

  /**
   * Override default executeGetCount() of TypeOrm
   */
  useGetManyAndCount?: boolean;

  /**
   * Apply skip, limit on the main query instead of the root
   */
  useNativeSkipAndOffset?: boolean;
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

export interface IBaseValidatorContext<T> {
  entity: T;
}

export interface IBaseTriggerOnPreValidationContext {
  [key: string]: any;
}
/**
 * An abstract Class for common CRUD use cases.
 *
 * Support role-validation, error handler, relations, filtering, sorting, pagination,
 * (by given query object parsed from LHS Bracket-styled URL)
 * @example /?search=xin chào các bạn&age=12&age=19&name=something&limit=20&page=1&sort=-createdAt
 */
export default abstract class ApiCrud<
  T,
  K extends IBaseValidatorContext<T> = any,
  V extends IBaseTriggerOnPreValidationContext = any
> {
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
  private reservedFilterFields = ['createdAt', 'deletedAt', 'updatedAt'];

  /**
   * Default validation behavior on Update and Delete tasks
   */
  private autoValidationOnUD: boolean;

  private hasTransformWithMeta: boolean;

  private schema: new (...args: any) => T;

  private tablePath: string;

  private relationsMeta: { path: string; meta: Record<string, string> }[];

  private createOrderByCombinedWithSelectExpression(
    this: SelectQueryBuilder<T>,
    parentAlias: string,
  ): [string, OrderByCondition] {
    // if table has a default order then apply it
    const orderBys = this.expressionMap.allOrderBys;
    const selectString = Object.keys(orderBys)
      .map(orderCriteria => {
        if (
          orderCriteria.indexOf('.') !== -1 &&
          orderCriteria.indexOf('(') === -1
        ) {
          const [aliasName, propertyPath] = orderCriteria.split('.');
          const alias = this.expressionMap.findAliasByName(aliasName);
          const column = alias.metadata.findColumnWithPropertyName(
            propertyPath,
          );
          return (
            this.escape(parentAlias) +
            '.' +
            this.escape(
              DriverUtils.buildColumnAlias(
                this.connection.driver,
                aliasName,
                column!.databaseName,
              ),
            )
          );
        } else {
          if (
            this.expressionMap.selects.find(
              select =>
                select.selection === orderCriteria ||
                select.aliasName === orderCriteria,
            )
          )
            return this.escape(parentAlias) + '.' + orderCriteria;

          return '';
        }
      })
      .join(', ');

    const orderByObject: OrderByCondition = {};
    Object.keys(orderBys).forEach(orderCriteria => {
      // if (orderCriteria.indexOf('(') !== -1) {
      //   console.log('get here');
      //   const betweenFirstParentheseAndComma = orderCriteria
      //     .split('(')[1]
      //     .split(',')[0];
      //   const [
      //     aliasName,
      //     propertyPath,
      //   ] = betweenFirstParentheseAndComma.split('.');
      //   const alias = this.expressionMap.findAliasByName(aliasName);
      //   const column = alias.metadata.findColumnWithPropertyName(
      //     propertyPath,
      //   );
      //   orderByObject[`${aliasName}.${column.databaseName}`] =
      //     orderBys[orderCriteria];
      // } else
      if (
        orderCriteria.indexOf('.') !== -1 &&
        orderCriteria.indexOf('(') === -1
      ) {
        const [aliasName, propertyPath] = orderCriteria.split('.');
        const alias = this.expressionMap.findAliasByName(aliasName);
        const column = alias.metadata.findColumnWithPropertyName(propertyPath);
        orderByObject[
          this.escape(parentAlias) +
            '.' +
            this.escape(
              DriverUtils.buildColumnAlias(
                this.connection.driver,
                aliasName,
                column!.databaseName,
              ),
            )
        ] = orderBys[orderCriteria];
      } else {
        if (
          this.expressionMap.selects.find(
            select =>
              select.selection === orderCriteria ||
              select.aliasName === orderCriteria,
          )
        ) {
          orderByObject[this.escape(parentAlias) + '.' + orderCriteria] =
            orderBys[orderCriteria];
        } else {
          orderByObject[orderCriteria] = orderBys[orderCriteria];
        }
      }
    });

    return [selectString, orderByObject];
  }

  constructor(repository: Repository<T>, option: IApiCrudOptions) {
    this.repository = repository;

    this.options = option;

    this.hasTransformWithMeta = option.hasTransformWithMeta || true;

    this.autoValidationOnUD = option.autoValidateOnUD || true;

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

  protected abstract validateRole(context: K): boolean;
  // protected abstract validateRole(entity: T, ...args: any): boolean;

  /**
   * @abstract
   * An abstract function to get entity from database and send it to validation pipeline
   */
  protected abstract triggerOnPreValidation?(context: V): Promise<T>;

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

    this.tablePath = metadata.tablePath;

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

    // reflect relations meta
    this.relationsMeta = this.repository.metadata.relations.map(r => ({
      path: r.inverseEntityMetadata.name.toLowerCase(),
      meta: r.inverseEntityMetadata.columns.reduce(
        (acc, cur) => ({
          ...acc,
          [cur.propertyName]: cur.isArray
            ? 'array'
            : typeof cur.type === 'function'
            ? cur.type.name.toLowerCase()
            : cur.type,
        }),
        {},
      ),
    }));
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

    if (preValidator) {
      if (preValidator.constructor.name === 'AsyncFunction')
        try {
          await preValidator();
        } catch (error) {
          throw error;
        }

      preValidator();
    }

    if (this.triggerOnPreValidation && validateOptions.triggerContext) {
      entity = await this.triggerOnPreValidation(
        validateOptions.triggerContext,
      );
    }

    const { validatorContext } = validateOptions;
    validatorContext.entity = entity;

    if (!this.validateRole(validatorContext)) throw new ForbiddenException();

    if (postValidator) {
      if (postValidator.constructor.name === 'AsyncFunction') {
        try {
          await postValidator(entity);
        } catch (error) {
          throw error;
        }
      } else {
        postValidator(entity);
      }
    }
  }

  /**
   * Stringify error object to a more human-readable version
   * @example { username: 'alice', address: 'lorem'} => 'username: alice, address: lorem'
   * @param obj
   */
  private stringifyObject(obj: Record<string, any>): string {
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
  private withAlias(key: string, isSubAlias?: boolean): string {
    return this.options.excludeAlias && this.options.excludeAlias.includes(key)
      ? key
      : isSubAlias
      ? `sub${this.alias}.${key}`
      : `${this.alias}.${key}`;
  }

  /**
   * Interal method to create a SelectQueryBuilder
   *
   * By default: create single query by SelectQueryBuilder to retrieve data
   *
   * If `options.usePaginationOnParent` is set to true and there is at least 1 relation: create 3 query, the main one will be queried directly to the database to retrieve data,
   * the remainder is to
   * generate a subQuery which should be passed into expressionMap.mainAlias.subQuery of the main query for pagination purpose. If `options.useGetManyAndCount` create custom query
   * to get the exact count value
   *
   * @param queryParams
   * @param extendFromQueries
   * @param options
   */
  private createQuery(
    queryParams: TApiFeaturesDto<T>,
    extendFromQueries?: TExtendFromQueries<T>,
    options?: IRelationExposedLevel & ICreateFindOne & IPaginationOnRoot,
  ): SelectQueryBuilder<T> {
    if (options?.usePaginationOnParent && this.options.relations) {
      const mainQuery = this.repository.createQueryBuilder(this.alias);

      const subQuery = this.repository.manager.connection
        .createQueryBuilder()
        .select(this.alias)
        .from(qb => {
          qb.from(this.tablePath, `sub${this.alias}`);
          this.setFilterConditions(qb, queryParams, true);
          this.setOrderBy(qb, queryParams, true);
          this.setSearchParam(qb, queryParams, true);

          if (!options.useNativeSkipAndOffset)
            this.setPagination(qb, queryParams);
          return qb;
        }, this.alias);

      if (options.useNativeSkipAndOffset)
        this.setPagination(mainQuery, queryParams);

      this.setRelations(mainQuery, options);

      if (extendFromQueries)
        this.setExtendFromQueries(mainQuery, extendFromQueries);

      this.setSearchParam(mainQuery, queryParams);

      mainQuery.expressionMap.mainAlias.subQuery =
        subQuery.expressionMap.mainAlias.subQuery;

      if (options.useGetManyAndCount) {
        const query = this.repository.createQueryBuilder(this.alias);

        this.setRelations(query, options);

        if (extendFromQueries)
          this.setExtendFromQueries(query, extendFromQueries);

        this.setFilterConditions(query, queryParams);
        this.setSearchParam(query, queryParams, false, true);

        (mainQuery as any).executeCountQuery = (mainQuery as any).executeCountQuery.bind(
          query,
        );

        // console.log(mainQuery.getCount())
      }

      // console.log(mainQuery.printSql());
      return mainQuery;
    }

    // console.log('should not here');
    const query = this.repository.createQueryBuilder(this.alias);

    this.setRelations(query, options);

    if (extendFromQueries) this.setExtendFromQueries(query, extendFromQueries);

    this.setFilterConditions(query, queryParams);
    this.setOrderBy(query, queryParams);
    this.setPagination(query, queryParams, options);
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
    useSubAlias?: boolean,
  ) {
    // TODO allow multiple sort conditions

    // Set default Sort Option
    if (!queryParams.sort) {
      query.orderBy(this.withAlias('createdAt', useSubAlias), 'ASC');
      return;
    }
    if (queryParams.sort.startsWith('-')) {
      const sortFields = queryParams.sort.split('-')[1];
      query.orderBy(this.withAlias(sortFields, useSubAlias), 'DESC');
      return;
    }

    query.orderBy(this.withAlias(queryParams.sort, useSubAlias), 'ASC');
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
    options?: {
      findOne?: boolean;
    },
  ) {
    if (options?.findOne) return;
    let { limit = 30, page = 1 } = queryParams;

    // Convert limit to type of integer, validate for maximum value
    const _limit = parseInt(limit as string);
    limit = _limit !== NaN && _limit <= 30 ? _limit : 30;

    // Convert page to type of integer, validate for min value
    const _page = parseInt(page as string);
    page = _page !== NaN && _page > 0 ? _page : 1;

    query.offset((page - 1) * limit).limit(limit);

    queryParams.limit = limit;
    queryParams.page = page;
  }

  /**
   * Apply search param on tsvector column, its query came from `?search=some thing else`
   */
  private setSearchParam(
    query: SelectQueryBuilder<T>,
    queryParams: TApiFeaturesDto<T>,
    useSubAlias?: boolean,
    noOrder?: boolean,
  ) {
    let searchFieldWithAlias = '';
    const { searchOnRelation } = this.options;

    if (searchOnRelation) {
      const idx = this.relationsMeta.findIndex(
        e => e.path === searchOnRelation,
      );

      if (
        idx >= 0 &&
        this.relationsMeta[idx].meta.searchWeights === 'tsvector' &&
        !useSubAlias
      ) {
        searchFieldWithAlias = `${searchOnRelation}.searchWeights`;
      } else return;
    } else {
      if (this.meta.searchWeights !== 'tsvector') return;
      searchFieldWithAlias = this.withAlias('searchWeights', useSubAlias);
    }

    const { search } = queryParams;

    if (search) {
      query.andWhere(
        `${searchFieldWithAlias} @@ plainto_tsquery(unaccent('${search}'))`,
      );

      // console.log(query.expressionMap.aliases);
      // query.expressionMap.aliases.push({
      //   name: `ts_rank(profile`,
      //   type: 'other',
      //   // _metadata: this.repository.manager.connection.getMetadata(
      //   //   searchFieldWithAlias.split('.')[0],
      //   // ),
      //   target: Profile,
      //   metadata: this.repository.manager.connection.getMetadata(
      //     searchFieldWithAlias.split('.')[0],
      //   ),
      //   tablePath: 'profile',
      //   hasMetadata: true,
      // });

      if (!noOrder) {
        query.addOrderBy(
          `ts_rank(${searchFieldWithAlias}, plainto_tsquery(unaccent('${search}')))`,
          'DESC',
        );
      }

      Object.defineProperty(
        query,
        'createOrderByCombinedWithSelectExpression',
        {
          value: this.createOrderByCombinedWithSelectExpression,
        },
      );
    }
  }

  /**
   * Set filter by parameters from query: `field1=value1&field2=value2`
   */
  private setFilterConditions(
    query: SelectQueryBuilder<T>,
    queryParams: TApiFeaturesDto<T>,
    useSubAlias?: boolean,
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
        const keyWithAlias = this.withAlias(key, useSubAlias);

        if (Array.isArray(filters[key])) {
          if (filters[key].length === 0) return;

          if (this.meta[key] === 'array') {
            q.andWhere(
              `lower(${keyWithAlias}::text)::text[] && '${this.toPgLiteralArray(
                filters[key],
              )}'`,
              // {
              //   [`val_${keyIdx}`]: this.toPgLiteralArray(filters[key]),
              // },
            );
            return;
          }

          const bracket = new Brackets(qb => {
            filters[key].forEach((subFilter, sfIdx) => {
              if (this.meta[key] === 'array') {
                // qb.orWhere(`${keyWithAlias} && :val_${keyIdx}_${sfIdx}`, {
                //   [`val_${keyIdx}_${sfIdx}`]: subFilter,
                // });
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
            q.andWhere(
              `lower(${keyWithAlias}::text)::text[] && :val_${keyIdx}`,
              {
                [`val_${keyIdx}`]: this.toPgLiteralArray(filters[key]),
              },
            );
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

    query.andWhere(queryBrackets);
  }

  /**
   * Apply relation to perform join operator
   * @param query
   */
  private setRelations(
    query: SelectQueryBuilder<T>,
    hasRelation?: IRelationExposedLevel,
    useSubAlias?: boolean,
  ): void {
    if (!this.options.relations) return;
    const { include, exclude } = hasRelation || {
      include: undefined,
      exclude: undefined,
    };

    if (Array.isArray(this.options.relations)) {
      this.options.relations.forEach(({ prop, alias, nestedRelation }) => {
        if (exclude && exclude.includes(alias)) return;

        const propWithAlias = this.withAlias(prop, useSubAlias);
        query.leftJoinAndSelect(propWithAlias, alias);

        if (
          nestedRelation &&
          Array.isArray(nestedRelation) &&
          nestedRelation.length > 0
        ) {
          nestedRelation.forEach(({ prop: childProp, alias: childAlias }) => {
            if (exclude && exclude.includes(childAlias)) return;
            const nestedPropWithParentAlias = `${alias}.${childProp}`;
            query.leftJoinAndSelect(nestedPropWithParentAlias, childAlias);
          });
        }
      });

      return;
    }

    const { prop, alias, nestedRelation } = this.options.relations;

    if (exclude && exclude.includes(alias)) return;

    const propWithAlias = this.withAlias(prop, useSubAlias);
    query.leftJoinAndSelect(propWithAlias, alias);

    if (
      nestedRelation &&
      Array.isArray(nestedRelation) &&
      nestedRelation.length > 0
    ) {
      nestedRelation.forEach(({ prop: childProp, alias: childAlias }) => {
        if (exclude && exclude.includes(childAlias)) return;
        const nestedPropWithParentAlias = `${alias}.${childProp}`;
        query.leftJoinAndSelect(nestedPropWithParentAlias, childAlias);
      });
    }
  }

  private toPgLiteralArray(val: string | string[]): string {
    if (typeof val === 'string') return `{"${val.toLowerCase()}"}`;

    return val.length > 0
      ? val.reduce((acc, cur, idx, origin) => {
          acc += `"${cur.toLowerCase()}",`;

          if (idx === origin.length - 1) {
            acc = acc.slice(0, -1);
            acc += '}';
          }
          return acc;
        }, '{')
      : `{}`;
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
    validateOptions?: IApiCrudValidatorOptions<T, K, V>,
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
    validateOptions?: IApiCrudValidatorOptions<T, K, V>,
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
    validateOptions?: IApiCrudValidatorOptions<T, K, V>,
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
  public async getMany(
    queryParams: TApiFeaturesDto<T>,
    extendQueries?: TExtendFromQueries<T>,
  ): Promise<T[]> {
    const query = this.createQuery(queryParams, extendQueries);

    try {
      const result = await query.getMany();

      return result;
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
    options?: IPaginationOnRoot & IRelationExposedLevel,
  ): Promise<WithMeta<T[]>> {
    const query = this.createQuery(queryParams, extendQueries, options);
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
    excludeAliases?: string[],
  ): Promise<T> {
    const { limit, page, sort, search, ...conditions } = queryParams;
    const query = this.createQuery(queryParams, extendFromQueries, {
      exclude: excludeAliases,
      findOne: true,
    });
    const result = await query.getOne();

    if (!result)
      throw new NotFoundException(
        `No ${this.alias} found with ${this.stringifyObject(conditions)}`,
      );

    return result;
  }
}
