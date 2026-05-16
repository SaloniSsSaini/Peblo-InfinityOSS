import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { CreateNoteDto } from './dto/create-note.dto';
import { ShareNoteDto } from './dto/share-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  @ApiOperation({ summary: 'List notes in a workspace (JWT); optional q (title/content) and tag' })
  list(
    @Query('workspaceId') workspaceId: string,
    @Query('q') q: string | undefined,
    @Query('tag') tag: string | undefined,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.notes.list(workspaceId, req.user.userId, { q, tag });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one note (JWT)' })
  getOne(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.notes.getOne(id, req.user.userId);
  }

  @Post(':id/share')
  @ApiOperation({ summary: 'Create or return read-only share token (author only)' })
  publishShare(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtUser },
    @Body() dto: ShareNoteDto,
  ) {
    return this.notes.publishShare(id, req.user.userId, dto.regenerate === true);
  }

  @Delete(':id/share')
  @ApiOperation({ summary: 'Revoke public share link (author only)' })
  revokeShare(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.notes.revokeShare(id, req.user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a note (JWT)' })
  create(
    @Query('workspaceId') workspaceId: string,
    @Req() req: Request & { user: JwtUser },
    @Body() dto: CreateNoteDto,
  ) {
    return this.notes.create(workspaceId, req.user.userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update note (author): title, content, tags, format, parentId' })
  patch(
    @Param('id') id: string,
    @Req() req: Request & { user: JwtUser },
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notes.update(id, req.user.userId, dto);
  }
}
