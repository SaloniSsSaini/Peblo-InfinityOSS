import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotesController } from './notes.controller';
import { PublicNotesController } from './public-notes.controller';
import { NotesService } from './notes.service';

@Module({
  imports: [AuthModule],
  controllers: [NotesController, PublicNotesController],
  providers: [NotesService],
})
export class NotesModule {}
