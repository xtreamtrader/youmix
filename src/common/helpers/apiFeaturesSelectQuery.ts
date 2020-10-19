import { TApiFeaturesDto } from '../interfaces/api-features';
import { SelectQueryBuilder } from 'typeorm';

export default class ApiFeaturesQuery<T> {
  private queryParams: TApiFeaturesDto<T>;
  private query: SelectQueryBuilder<T>;

  constructor(query: SelectQueryBuilder<T>, queryParams: TApiFeaturesDto<T>) {
    this.queryParams = queryParams;
    this.query = query;
  }
}
