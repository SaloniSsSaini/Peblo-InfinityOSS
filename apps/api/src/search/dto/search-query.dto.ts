import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ description: 'Workspace to search within' })
  @IsString()
  @MinLength(8)
  workspaceId!: string;

  @ApiProperty({ description: 'Search text (title, body, task description)' })
  @IsString()
  @MinLength(2)
  q!: string;

  @ApiPropertyOptional({ default: 8, maximum: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 8;
}
