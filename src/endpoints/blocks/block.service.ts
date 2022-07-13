import { Injectable } from "@nestjs/common";
import { Block } from "./entities/block";
import { BlockDetailed } from "./entities/block.detailed";
import { MiniBlockService } from "src/endpoints/miniblocks/mini.block.service";
import { TransactionService } from "src/endpoints/transactions/transaction.service";
import { CachingService } from "src/common/caching/caching.service";
import { BlockFilter } from "./entities/block.filter";
import { QueryPagination } from "src/common/entities/query.pagination";
// import { TermsQuery } from "src/common/elastic/entities/terms.query";
import { BlsService } from "src/endpoints/bls/bls.service";
import { Constants } from "src/utils/constants";
import { QueryConditionOptions } from "src/common/elastic/entities/query.condition.options";
import { ElasticService } from "src/common/elastic/elastic.service";
import { AbstractQuery } from "src/common/elastic/entities/abstract.query";
import { QueryType } from "src/common/elastic/entities/query.type";
import { ElasticQuery } from "src/common/elastic/entities/elastic.query";
import { ElasticSortOrder } from "src/common/elastic/entities/elastic.sort.order";
import { CacheInfo } from "src/common/caching/entities/cache.info";

@Injectable()
export class BlockService {
  constructor(
    private readonly elasticService: ElasticService,
    private readonly cachingService: CachingService,
    private readonly blsService: BlsService,
    private readonly miniblockService: MiniBlockService,
    private readonly transactionService: TransactionService,
  ) { }

  private async buildElasticBlocksFilter(filter: BlockFilter): Promise<AbstractQuery[]> {
    const { shard, proposer, validator, epoch, nonce, nonce_between } = filter;

    const queries: AbstractQuery[] = [];
    if (nonce !== undefined) {
      const nonceQuery = QueryType.Match("nonce", nonce);
      queries.push(nonceQuery);
    }
    if (shard !== undefined) {
      const shardIdQuery = QueryType.Match('shardId', shard);
      queries.push(shardIdQuery);
    }

    if (epoch !== undefined) {
      const epochQuery = QueryType.Match('epoch', epoch);
      queries.push(epochQuery);
    }

    if (nonce_between !== undefined) {
      const start = nonce_between[0]
      const end = nonce_between[1] ? nonce_between[1] : start

      const nonceQuery = QueryType.Range("nonce", end, start)
      queries.push(nonceQuery);
    }

    if (proposer && shard !== undefined && epoch !== undefined) {
      const index = await this.blsService.getBlsIndex(proposer, shard, epoch);
      const proposerQuery = QueryType.Match('proposer', index);
      queries.push(proposerQuery);
    }

    if (validator && shard !== undefined && epoch !== undefined) {
      const index = await this.blsService.getBlsIndex(validator, shard, epoch);
      const validatorsQuery = QueryType.Match('validators', index);
      queries.push(validatorsQuery);
    }

    return queries;
  }

  async getBlocksCount(filter: BlockFilter): Promise<number> {
    const elasticQuery: ElasticQuery = ElasticQuery.create()
      .withCondition(QueryConditionOptions.must, await this.buildElasticBlocksFilter(filter));

    return await this.cachingService.getOrSetCache(
      `blocks:count:${JSON.stringify(elasticQuery)}`,
      async () => await this.elasticService.getCount('blocks', elasticQuery),
      Constants.oneMinute()
    );
  }

  async getBlocks(filter: BlockFilter, queryPagination: QueryPagination): Promise<BlockDetailed[]> {
    const { from, size } = queryPagination;

    let elasticQuery = ElasticQuery.create()
      .withPagination({ from, size })
      .withSort([{ name: 'timestamp', order: ElasticSortOrder.descending }])
      .withCondition(QueryConditionOptions.must, await this.buildElasticBlocksFilter(filter));

    let result = await this.elasticService.getList('blocks', 'hash', elasticQuery);

    if (filter.withSenderMiniBlocks) {
      const block_hashes = [...result.map((block) => block.hash)];
      const miniblocks = await this.miniblockService.getMiniBlocks({ senderBlockHashes: block_hashes }, { from, size })

      result.map(r => r.miniBlocks = miniblocks.filter(({ senderBlockHash }) => senderBlockHash == r.hash))

      if (filter.withMiniBlocksTransactions && miniblocks.length !== 0) {
        const miniblock_hashes = [...miniblocks.map((miniblock) => miniblock.miniBlockHash)]

        const transaction = await this.transactionService.getTransactions(
          { miniBlockHashes: miniblock_hashes },
          { from, size },
          { withLogs: true, withScResults: true, withOperations: true }
        );

        for (const r of result) {
          r.miniBlocks.map(
            (miniblock: any) =>
              miniblock.transactions = transaction.filter(({ miniBlockHash }) => miniblock.miniBlockHash == miniBlockHash)
          )

          r.miniBlocksCount = r.miniBlocks?.length
          r.txCount = r.miniBlocks?.reduce((sum: number, item: any) => sum +  item.transactions?.length, 0)
        }
      }
    }

    const blocks = [];
    for (const item of result) {
      const blockRaw = await this.computeProposerAndValidators(item);

      if (blockRaw.round > 0) {
        const publicKeys = await this.blsService.getPublicKeys(blockRaw.shardId, blockRaw.epoch);
        blockRaw.proposer = publicKeys[blockRaw.proposer];
        blockRaw.validators = blockRaw.validators.map((validator: number) => publicKeys[validator]);
      } else {
        blockRaw.validators = [];
      }

      const block = Block.mergeWithElasticResponse(new BlockDetailed(), blockRaw);
      blocks.push(block);
    }

    return blocks;
  }

  async computeProposerAndValidators(item: any) {
    const { shardId, epoch, searchOrder, ...rest } = item;
    let { proposer, validators } = item;

    let blses: any = await this.cachingService.getCacheLocal(CacheInfo.ShardAndEpochBlses(shardId, epoch).key);
    if (!blses) {
      blses = await this.blsService.getPublicKeys(shardId, epoch);

      await this.cachingService.setCacheLocal(CacheInfo.ShardAndEpochBlses(shardId, epoch).key, blses, CacheInfo.ShardAndEpochBlses(shardId, epoch).ttl);
    }

    proposer = blses[proposer];

    if (validators) {
      validators = validators.map((index: number) => blses[index]);
    }

    return { shardId, epoch, proposer, validators, ...rest };
  }

  async getBlock(hash: string): Promise<BlockDetailed> {
    const result = await this.elasticService.getItem('blocks', 'hash', hash);

    if (result.round > 0) {
      const publicKeys = await this.blsService.getPublicKeys(result.shardId, result.epoch);
      result.proposer = publicKeys[result.proposer];
      result.validators = result.validators.map((validator: number) => publicKeys[validator]);
    } else {
      result.validators = [];
    }

    return BlockDetailed.mergeWithElasticResponse(new BlockDetailed(), result);
  }

  async getCurrentEpoch(): Promise<number> {
    const blocks = await this.getBlocks(new BlockFilter(), { from: 0, size: 1 });
    if (blocks.length === 0) {
      return -1;
    }

    return blocks[0].epoch;
  }
}
