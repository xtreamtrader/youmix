export type TApiFeaturesDto<T> = {
  page?: string | number;
  limit?: string | number;
  search?: string;
  sort?: string;
} & TQueryParamsFromUrl<T>;

export type TQueryParamsFromUrl<T, K extends keyof T = keyof T> = {
  [key in K]?: TQueryOperator;
};

export type TQueryOperator = string | string[];

export type WithMeta<T> = {
  meta: {
    currentPage: number;
    totalPage: number;
    totalResult: number,
    limit: number;
    count: number;
  };

  data: T
};
