import { Injectable } from "@nestjs/common";
import { ElasticService } from "src/common/elastic/elastic.service";
import { ApiUtils } from "src/utils/api.utils";
import { MiniBlockDetailed } from "./entities/mini.block.detailed";
import { MiniBlockFilter } from "./entities/mini.block.filter";
import { AbstractQuery } from "src/common/elastic/entities/abstract.query";
import { QueryType } from "src/common/elastic/entities/query.type";
import { QueryConditionOptions } from "src/common/elastic/entities/query.condition.options";
import { ElasticQuery } from "src/common/elastic/entities/elastic.query";
import { TermsQuery } from "src/common/elastic/entities/terms.query";
import { QueryPagination } from "src/common/entities/query.pagination";

@Injectable()
export class MiniBlockService {
  constructor(private readonly elasticService: ElasticService) { }

  private async buildElasticMiniBlocksFilter(filter: MiniBlockFilter): Promise<AbstractQuery[]> {
    const { hash } = filter;

    const queries: AbstractQuery[] = [];

    if (hash !== undefined) {
      const hashQuery = QueryType.Match("_id", hash);
      queries.push(hashQuery);
    }

    return queries;
  }

  async getMiniBlocks(filter: MiniBlockFilter, queryPagination: QueryPagination): Promise<MiniBlockDetailed[]> {
    const { from, size } = queryPagination;

    let elasticQuery = ElasticQuery.create()
      .withPagination({ from, size })
      .withCondition(QueryConditionOptions.must, await this.buildElasticMiniBlocksFilter(filter))

    if (filter.hashes) {
      elasticQuery = elasticQuery.withCondition(QueryConditionOptions.must, new TermsQuery('_id', filter.hashes, true))
    }

    if (filter.senderBlockHashes) {
      elasticQuery = elasticQuery.withCondition(QueryConditionOptions.must, new TermsQuery('senderBlockHash', filter.senderBlockHashes, true))
    }

    const result = await this.elasticService.getList('miniblocks', 'miniBlockHash', elasticQuery);

    const miniblocks = [];
    for (const item of result) {
      const miniblock = ApiUtils.mergeObjects(new MiniBlockDetailed(), item);

      miniblocks.push(miniblock);
    }

    return miniblocks
  }

  async getMiniBlock(miniBlockHash: string): Promise<MiniBlockDetailed> {
    const result = await this.elasticService.getItem('miniblocks', 'miniBlockHash', miniBlockHash);

    return ApiUtils.mergeObjects(new MiniBlockDetailed(), result);
  }
}
