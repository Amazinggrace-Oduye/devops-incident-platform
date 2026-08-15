import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class MessageUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  message?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string;
}
