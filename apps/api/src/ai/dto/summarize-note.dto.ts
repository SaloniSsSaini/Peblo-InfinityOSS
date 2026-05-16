import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SummarizeNoteDto {
  @ApiProperty({ description: 'Note id (cuid)' })
  @IsString()
  @MinLength(8)
  noteId!: string;
}
