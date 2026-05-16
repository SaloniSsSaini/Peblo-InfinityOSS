import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { NotesService } from './notes.service';

@ApiTags('public')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
@Controller('public/notes')
export class PublicNotesController {
  constructor(private readonly notes: NotesService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Read-only shared note (no auth, rate limited)' })
  getByToken(@Param('token') token: string) {
    return this.notes.getPublicByToken(token);
  }
}
