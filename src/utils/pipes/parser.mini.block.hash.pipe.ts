import { ParseHashPipe } from "./parse.hash.pipe";

export class ParseMiniBlockHashPipe extends ParseHashPipe {
  constructor() {
    super('miniblock', 64);
  }
}
