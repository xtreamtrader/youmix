import { SelectQueryBuilder, Brackets } from 'typeorm';
import { TApiFeaturesDto, WithMeta } from '../interfaces/api-features';
import { camelCaseToSnakeCase } from './string.helper';
import { BadRequestException } from '@nestjs/common';

interface IApiFeatureOptions {
  numericFields?: string[];
  simpleArrayFields?: string[];
  jsonbFields?: string[];
  reservedFields?: string[];
  calculatedFileds?: { fromField: string; toField: string; cb: () => any }[];
}

/**
 * A Unitily Class to retrieve data from database matching to a number of conditions parsed from LHS Bracket-styled URL
 * @example /?search=xin chào các bạn&age=12&age=19&name=something&limit=20&page=1&sort=-createdAt
 */
export default class ApiFeature<T> {
  // TODO: Extract metadata from TypeOrm Entity
  // TODO: Refactor into NestJS Module
  private query: SelectQueryBuilder<T>;
  private queryParams: TApiFeaturesDto<T>;
  private option: IApiFeatureOptions;
  private reservedFilterFields = ['createdAt', 'deletedAt', 'updatedAt', 'id'];

  private limit: number;
  private page: number;

  constructor(
    query: SelectQueryBuilder<T>,
    queryParams: TApiFeaturesDto<T>,
    option?: IApiFeatureOptions,
  ) {
    if (option) this.option = option;

    if (!this.option.reservedFields)
      this.option.reservedFields = this.reservedFilterFields;

    this.query = query;

    this.queryParams = queryParams;

    this.init();
  }

  private init() {
    this.validateQueryParams();
    this.setFilterConditions();
    this.setOrderBy();
    this.setPagination();
    this.setSearchParam();
  }

  private validateQueryParams() {
    Object.keys(this.queryParams).forEach(key => {
      // validate for number fields
      if (this.option.numericFields.includes(key)) {
        if (Array.isArray(this.queryParams[key])) {
          this.queryParams[key].forEach(subFilter => {
            if (isNaN(subFilter))
              throw new BadRequestException(
                `Query for ${key} must be a numeric type or an array of number`,
              );
          });
          return;
        }

        if (isNaN(this.queryParams[key]))
          throw new BadRequestException(
            `Query for ${key} must be a numeric type or an array of number`,
          );
      }
    });
  }

  /**
   * Set sort by a parameter from query: `sort=fieldName` for ascending order or `sort=-fieldName` for descending order
   */
  private setOrderBy() {
    // Set default Sort Option
    if (!this.queryParams.sort) {
      this.query.orderBy('created_at', 'ASC');
      return;
    }

    if (this.queryParams.sort.startsWith('-')) {
      const sortFields = this.queryParams.sort.split('-')[1];
      this.query.orderBy(camelCaseToSnakeCase(sortFields), 'DESC');
      return;
    }

    this.query.orderBy(camelCaseToSnakeCase(this.queryParams.sort), 'ASC');
  }

  /**
   * Set pagination by a parameter from query: `?page=number&limit=number`
   */
  private setPagination() {
    let { limit = 30, page = 1 } = this.queryParams;

    // Convert limit to type of integer, validate for maximum value
    const _limit = parseInt(limit as string);
    limit = _limit !== NaN && _limit <= 30 ? _limit : 30;

    // Convert page to type of integer, validate for min value
    const _page = parseInt(page as string);
    page = _page !== NaN && _page > 0 ? _page : 1;

    this.query.skip((page - 1) * limit).take(limit);
    this.limit = limit;
    this.page = page;
  }

  /**
   * Apply search param on tsvector column
   */
  private setSearchParam() {
    const { search } = this.queryParams;

    if (search) {
      this.query
        .andWhere(`search_weights @@ plainto_tsquery(unaccent('${search}'))`)
        .orderBy(
          `ts_rank(search_weights, plainto_tsquery(unaccent('${search}')))`,
          'DESC',
        );
    }
  }

  /**
   * Set filter by a parameter from query: `filed1=value1&field2=value2`
   */
  private setFilterConditions() {
    const filters = (({ sort, limit, page, search, ...o }) => o)(
      this.queryParams,
    );

    Object.keys(filters).forEach(key => {
      if (Array.isArray(filters[key])) {
        if (filters[key].length === 0) return;

        const bracket = new Brackets(qb => {
          filters[key].forEach(subFilter => {
            if (this.option.jsonbFields.includes(key)) {
              return;
            }

            if (this.option.reservedFields.includes(key)) {
              return;
            }

            if (this.option.numericFields.includes(key)) {
              qb.orWhere(`${camelCaseToSnakeCase(key)} = ${subFilter}`);
              return;
            }

            if (this.option.simpleArrayFields.includes(key)) {
              qb.orWhere(`${camelCaseToSnakeCase(key)} ILIKE '%${subFilter}%'`);
              return;
            }

            qb.orWhere(`${camelCaseToSnakeCase(key)} ILIKE '${subFilter}'`);
          });
        });

        this.query.andWhere(bracket);
      } else {
        if (this.option.jsonbFields.includes(key)) {
          return;
        }

        if (this.option.reservedFields.includes(key)) {
          return;
        }

        if (this.option.numericFields.includes(key)) {
          this.query.andWhere(`${camelCaseToSnakeCase(key)} = ${filters[key]}`);
          return;
        }

        if (this.option.simpleArrayFields.includes(key)) {
          this.query.andWhere(
            `${camelCaseToSnakeCase(key)} ILIKE '%${filters[key]}%'`,
          );
          return;
        }

        this.query.andWhere(
          `${camelCaseToSnakeCase(key)} ILIKE '${filters[key]}'`,
        );
      }
    });
  }

  /**
   * Get many by queryParams as a condition and return a list of results with meta data for pagination purpose
   */
  async getManyWithMeta(): Promise<WithMeta<T[]>> {
    try {
      const result = await this.query.getManyAndCount();
      return {
        data: result[0],
        meta: {
          currentPage: this.page,
          limit: this.limit,
          count: result[0].length,
          totalPage: Math.ceil(result[1] / this.limit),
          totalResult: result[1],
        },
      };
    } catch (error) {
      if (error.name === 'QueryFailedError' && error.code === '42703')
        throw new BadRequestException('Invalid query paramaters');

      throw error;
    }
  }
}
