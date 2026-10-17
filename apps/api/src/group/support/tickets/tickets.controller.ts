import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type {
  AuthUser,
  SupportTicketDetail,
  SupportTicketSummary,
} from '@kia./shared';
import { MAX_TICKET_ATTACHMENT_BYTES, MAX_TICKET_ATTACHMENTS } from '@kia./shared';
import { CurrentUser } from '@kia./platform';
import { JwtAuthGuard } from '@kia./platform';
import { CreateTicketDto, TicketReplyDto } from './dto/ticket.dto';
import { TicketsService } from './tickets.service';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<SupportTicketSummary[]> {
    return this.ticketsService.listMine(user.id);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<SupportTicketDetail> {
    return this.ticketsService.getMine(user.id, id);
  }

  @Post()
  @UseInterceptors(
    FilesInterceptor('files', MAX_TICKET_ATTACHMENTS, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_TICKET_ATTACHMENT_BYTES },
    }),
  )
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTicketDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<SupportTicketDetail> {
    return this.ticketsService.create(user.id, dto, files);
  }

  @Post(':id/replies')
  @UseInterceptors(
    FilesInterceptor('files', MAX_TICKET_ATTACHMENTS, {
      storage: memoryStorage(),
      limits: { fileSize: MAX_TICKET_ATTACHMENT_BYTES },
    }),
  )
  reply(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: TicketReplyDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<SupportTicketDetail> {
    return this.ticketsService.reply(user.id, id, dto, files);
  }
}
