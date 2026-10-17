import { Module } from '@nestjs/common';
import { AdminAccessGuard } from '@kia./platform';
import { RolesGuard } from '@kia./platform';
import { SiteSettingsModule } from '@kia./platform';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [SiteSettingsModule],
  controllers: [MessagesController],
  providers: [MessagesService, RolesGuard, AdminAccessGuard],
})
export class MessagesModule {}
