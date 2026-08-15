import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { HealthCheckType } from '../../common/enums';

export class UpdateHealthCheckDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(HealthCheckType)
  type?: HealthCheckType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  target?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(86400)
  intervalSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(60000)
  timeoutMs?: number;

  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  expectedStatusCode?: number | null;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
