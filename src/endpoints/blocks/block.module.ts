import { forwardRef, Module } from "@nestjs/common";
import { BlsModule } from "../bls/bls.module";
import { BlockService } from "./block.service";
import { MiniBlockModule } from "../miniblocks/miniblock.module";
import { TransactionModule } from "../transactions/transaction.module";

@Module({
  imports: [
    BlsModule,
    MiniBlockModule,
    forwardRef(() => TransactionModule),
  ],
  providers: [
    BlockService,
  ],
  exports: [
    BlockService,
  ],
})
export class BlockModule { }
