import { Body, Controller, HttpException, HttpStatus, Post } from "@nestjs/common";
import { ProcessNftRequest } from "./entities/process.nft.request";
import { ProcessNftSettings } from "./entities/process.nft.settings";
import { ProcessNftsService } from "./process.nfts.service";

@Controller()
export class ProcessNftsController {
  constructor(
    private readonly processNftService: ProcessNftsService,
  ) { }

  @Post("/nfts/process")
  async generateThumbnails(
    @Body() processNftRequest: ProcessNftRequest,
  ): Promise<void> {
    let settings: ProcessNftSettings = {
      forceRefreshMedia: processNftRequest.forceRefreshMedia ?? false,
      forceRefreshMetadata: processNftRequest.forceRefreshMetadata ?? false,
      forceRefreshThumbnail: processNftRequest.forceRefreshThumbnail ?? false,
      skipRefreshThumbnail: processNftRequest.skipRefreshThumbnail ?? false
    }

    if (processNftRequest.collection) {
      await this.processNftService.processCollection(processNftRequest.collection, settings);
    } else if (processNftRequest.identifier) {
      await this.processNftService.processNft(processNftRequest.identifier, settings);
    } else {
      throw new HttpException('Provide an identifier or a collection to generate thumbnails for', HttpStatus.BAD_REQUEST);
    }
  }
}