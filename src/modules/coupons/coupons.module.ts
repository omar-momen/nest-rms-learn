import { Module } from '@nestjs/common';

import { CouponsService } from './coupons.service';
import { CouponsController } from './coupons.controller';

// TODO: restrict coupon management once roles exist
@Module({
  controllers: [CouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
