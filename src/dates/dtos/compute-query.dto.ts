import { IsInt, IsISO8601, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ComputeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  hours?: number;

  @IsOptional()
  @IsISO8601()
  date?: string; // debe terminar en Z; se valida en el controller
}
