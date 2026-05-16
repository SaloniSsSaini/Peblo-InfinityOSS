import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNoteDto {
  @ApiProperty({ minLength: 1, maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: ['RICH', 'MARKDOWN'] })
  @IsOptional()
  @IsIn(['RICH', 'MARKDOWN'])
  format?: 'RICH' | 'MARKDOWN';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  folderPath?: string;

  @ApiPropertyOptional({ description: 'Optional parent note (same workspace); tree root when omitted' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  parentId?: string;
}
