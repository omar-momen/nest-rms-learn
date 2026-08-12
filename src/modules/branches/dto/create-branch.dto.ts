import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  location: string;
}
