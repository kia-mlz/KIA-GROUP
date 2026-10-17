import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, LearnerMessageDto } from '@kia./shared';
import { AdminAccess } from '@kia./platform';
import { CurrentUser } from '@kia./platform';
import { Roles } from '@kia./platform';
import { AdminAccessGuard } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { RolesGuard } from '@kia./platform';
import { CreateLearnerMessageDto } from './dto/message.dto';
import { MessagesService } from './messages.service';

@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  listMine(@CurrentUser() user: AuthUser): Promise<LearnerMessageDto[]> {
    return this.messagesService.listForLearner(user.id);
  }

  @Patch('messages/:id/read')
  @UseGuards(JwtAuthGuard)
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<LearnerMessageDto> {
    return this.messagesService.markRead(user.id, id);
  }

  @Post('admin/messages')
  @UseGuards(JwtAuthGuard, RolesGuard, AdminAccessGuard)
  @Roles('ADMIN')
  @AdminAccess('users', 'manage')
  adminCreate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLearnerMessageDto,
  ): Promise<LearnerMessageDto> {
    return this.messagesService.adminCreate(user.id, dto);
  }
}
