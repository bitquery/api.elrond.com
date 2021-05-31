import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientOptions, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from 'config/configuration';
import { TransactionProcessorService } from './crons/transaction.processor.service';
import { ApiConfigService } from './helpers/api.config.service';
import { PublicAppModule } from './public.app.module';
import { EventsGateway } from './websockets/events.gateway';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      load: [configuration]
    }),
    PublicAppModule,
  ],
  controllers: [],
  providers: [
    TransactionProcessorService, EventsGateway,
    {
      provide: 'PUBSUB_SERVICE',
      useFactory: (apiConfigService: ApiConfigService) => {
        let clientOptions: ClientOptions = {
          transport: Transport.REDIS,
          options: {
            url: `redis://${apiConfigService.getRedisUrl()}:6379`
          }
        };

        return ClientProxyFactory.create(clientOptions);
      },
      inject: [ ApiConfigService ]
    }
  ],
})
export class TransactionProcessorModule {}