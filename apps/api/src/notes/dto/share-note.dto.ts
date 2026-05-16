import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ShareNoteDto {
  @ApiPropertyOptional({ description: 'Issue a new token and invalidate the old link' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  regenerate?: boolean;
}
