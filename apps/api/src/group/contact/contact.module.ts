import { Module } from '@nestjs/common';
import { EmailModule } from '@kia./platform';
import { SiteSettingsModule } from '@kia./platform';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

@Module({
  imports: [EmailModule, SiteSettingsModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
