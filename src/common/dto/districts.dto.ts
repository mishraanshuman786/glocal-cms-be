import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
  IsArray,
  
} from 'class-validator';

const transformBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;

  return value;
};

export class CreateDistrictDto {
  @IsUUID()
  stateId: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class BulkDistrictItemDto{
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name:string;

  @IsOptional()
  @IsBoolean()
  isActive?:boolean;
}

export class CreateDistrictsBulkDto{
  @IsUUID()
  stateId:string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({each:true})
  @Type(()=> BulkDistrictItemDto)
  districts: BulkDistrictItemDto[];

}

export class UpdateDistrictDto {
  @IsOptional()
  @IsUUID()
  stateId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateDistrictStatusDto {
  @Transform(transformBoolean)
  @IsBoolean()
  isActive: boolean;
}

export class ListDistrictsDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  search?: string;

  @IsOptional()
  @IsUUID()
  stateId?: string;

  @IsOptional()
  @Transform(transformBoolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 10;
}
