import { Controller, Get, DefaultValuePipe, HttpException, HttpStatus, Param, Query, ParseIntPipe } from "@nestjs/common";
import { ApiResponse, ApiTags, ApiQuery } from "@nestjs/swagger";
import { ParseMiniBlockHashPipe } from "src/utils/pipes/parser.mini.block.hash.pipe";
import { ParseBlockHashPipe } from "src/utils/pipes/parse.block.hash.pipe";
import { ParseArrayPipe } from "src/utils/pipes/parse.array.pipe";
import { MiniBlockDetailed } from "./entities/mini.block.detailed";
import { MiniBlockService } from "./mini.block.service";

@Controller()
@ApiTags('miniblocks')
export class MiniBlockController {
  constructor(private readonly miniBlockService: MiniBlockService) { }

  @Get('/miniblocks')
  @ApiResponse({
    status: 200,
    description: 'The miniblocks available on the blockchain',
    isArray: true
  })
  @ApiQuery({ name: 'hash', description: 'Filter by miniblock hash', required: false })
  @ApiQuery({ name: 'hashes', description: 'Filter by array miniblock hash', required: false })
  @ApiQuery({ name: 'senderBlockHashes', description: 'Filter by array miniblock hash', required: false })
  @ApiQuery({ name: 'from', description: 'Numer of items to skip for the result set', required: false })
  @ApiQuery({ name: 'size', description: 'Number of items to retrieve', required: false })
  getMiniBlock(
    @Query('hash', ParseMiniBlockHashPipe) hash: string | undefined,
    @Query('hashes', ParseArrayPipe) hashes: string[] | undefined,
    @Query('senderBlockHashes', ParseArrayPipe ) senderBlockHashes: string[] | undefined,
    @Query('from', new DefaultValuePipe(0), ParseIntPipe) from: number,
    @Query("size", new DefaultValuePipe(25), ParseIntPipe) size: number,
  ): Promise<MiniBlockDetailed[]> {
    return this.miniBlockService.getMiniBlocks({hash, hashes, senderBlockHashes}, { from, size })
  }

  @Get("/miniblocks/:miniBlockHash")
  @ApiResponse({
    status: 200,
    description: 'The details of a given MiniBlock',
    type: MiniBlockDetailed,
  })
  @ApiResponse({
    status: 404,
    description: 'Miniblock not found',
  })
  async getBlock(@Param('miniBlockHash', ParseBlockHashPipe) miniBlockHash: string): Promise<MiniBlockDetailed> {
    try {
      return await this.miniBlockService.getMiniBlock(miniBlockHash);
    } catch {
      throw new HttpException('Miniblock not found', HttpStatus.NOT_FOUND);
    }
  }
}
