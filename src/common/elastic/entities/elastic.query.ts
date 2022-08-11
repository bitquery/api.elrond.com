import { ApiUtils } from "src/utils/api.utils";
import { AbstractQuery } from "./abstract.query";
import { ElasticPagination } from "./elastic.pagination";
import { ElasticSortProperty } from "./elastic.sort.property";
import { QueryCondition } from "./query.condition";
import { QueryConditionOptions } from "./query.condition.options";
import { ElasticSourceProperty } from "./elastic.source.property";
import { RangeQuery } from "./range.query";
import { TermsQuery } from "./terms.query";

function buildElasticIndexerSort(sorts: ElasticSortProperty[]): any[] {
  if (!sorts) {
    return [];
  }

  return sorts.map((sortProp: ElasticSortProperty) => ({ [sortProp.name]: { order: sortProp.order } }));
}

function buildElasticSource(source: ElasticSourceProperty[]): any[] {
  if (!source) {
    return [];
  }

  return Object.fromEntries(source.map(e => [e.method, e.name]))
}

export class ElasticQuery {
  pagination?: ElasticPagination;
  sort: ElasticSortProperty[] = [];
  source: ElasticSourceProperty[] = [];
  filter: AbstractQuery[] = [];
  condition: QueryCondition = new QueryCondition();
  terms?: TermsQuery;

  static create(): ElasticQuery {
    return new ElasticQuery();
  }

  withPagination(pagination: ElasticPagination): ElasticQuery {
    this.pagination = pagination;

    return this;
  }

  withSort(sort: ElasticSortProperty[]): ElasticQuery {
    this.sort = sort;

    return this;
  }

  withSource(source: ElasticSourceProperty[]): ElasticQuery {
    this.source = source;

    return this;
  }

  withMustCondition(queries: AbstractQuery[] | AbstractQuery): ElasticQuery {
    return this.withCondition(QueryConditionOptions.must, queries);
  }

  withMustNotCondition(queries: AbstractQuery[] | AbstractQuery): ElasticQuery {
    return this.withCondition(QueryConditionOptions.mustNot, queries);
  }

  withShouldCondition(queries: AbstractQuery[] | AbstractQuery): ElasticQuery {
    return this.withCondition(QueryConditionOptions.should, queries);
  }

  withCondition(queryCondition: QueryConditionOptions, queries: AbstractQuery[] | AbstractQuery): ElasticQuery {
    if (!Array.isArray(queries)) {
      queries = [queries];
    }

    if (!this.condition[queryCondition]) {
      this.condition[queryCondition] = [];
    }

    this.condition[queryCondition].push(...queries);

    return this;
  }

  withTerms(termsQuery: TermsQuery): ElasticQuery {
    this.terms = termsQuery;

    return this;
  }

  withFilter(filter: RangeQuery[]): ElasticQuery {
    this.filter = filter;

    return this;
  }

  toJson() {
    const elasticSort = buildElasticIndexerSort(this.sort);
    const elasticSource = buildElasticSource(this.source);

    const elasticQuery = {
      ...this.pagination,
      sort: elasticSort,
      _source: elasticSource,
      query: {
        bool: {
          filter: this.filter.map(query => query.getQuery()),
          must: this.condition.must.map(query => query.getQuery()),
          should: this.condition.should.map(query => query.getQuery()),
          must_not: this.condition.must_not.map(query => query.getQuery()),
          minimum_should_match: this.condition.should.length !== 0 ? 1 : undefined,
        },
        terms: this.terms?.getQuery(),
      },
    };

    ApiUtils.cleanupApiValueRecursively(elasticQuery);

    if (Object.keys(elasticQuery.query.bool).length === 0) {
      //@ts-ignore
      delete elasticQuery.query.bool;

      if (!this.terms) {
        //@ts-ignore
        elasticQuery.query['match_all'] = {};
      }
    }

    return elasticQuery;
  }
}
