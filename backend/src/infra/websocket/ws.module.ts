import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { WsGateway } from './ws.gateway';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [WsGateway],
  exports: [WsGateway],
})
export class WsModule {}
