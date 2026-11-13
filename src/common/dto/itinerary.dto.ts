import { ArrayMinSize,IsArray,IsEnum, IsInt,IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, Min, Max, ValidateNested } from "class-validator";

import { Type } from "class-transformer";
import { itineraryStatusEnum } from "../../database/schema";

class CreateItineraryActivityDto{
    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    title:string;

    @IsInt()
    @Min(1)
    order:number;

}

class CreateItineraryDayDto{
    @IsInt()
    @Min(1)
    dayNumber:number;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title:string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({each:true})
    @Type(()=>CreateItineraryActivityDto)
    activities:CreateItineraryActivityDto[]

}

export class CreateItineraryDto{
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    title:string;

      @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateItineraryDayDto)
  days: CreateItineraryDayDto[];

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE'])
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export class ListItinerariesDto{
    @IsOptional()
    @IsString()
    @MaxLength(200)
    search?:string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE'])
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';

  @IsOptional()
  @Type(()=>Number)
  @IsInt()
  @Min(1)
  page=1;

  @IsOptional()
  @Type(()=>Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit=10;
}

export class UpdateItineraryStatusDto{
 @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE'])
    status:'DRAFT'|'ACTIVE'|'INACTIVE';
}