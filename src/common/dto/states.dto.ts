import { Transform, Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsInt, Min, IsBoolean, IsString, MaxLength, IsOptional } from 'class-validator';
import { boolean } from 'drizzle-orm/gel-core';

export const STATE_REGIONS = [
  'NORTH',
  'SOUTH',
  'EAST',
  'WEST',
  'NORTH_EAST',
] as const;

export type StateRegion = (typeof STATE_REGIONS)[number];

export class CreateStateDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsIn(STATE_REGIONS)
  region: StateRegion;
}

export class UpdateStateStatusDto{
    @Type(()=>Boolean)
    @IsBoolean()
    isActive: boolean;
}

export class ListStatesDto{
    @IsOptional()
    @IsString()
    @MaxLength(150)
    search?:string;

    @IsOptional()
    @IsIn([...STATE_REGIONS, "ALL"])
    region?:string;

    @IsOptional()
    @Type(()=>Boolean)
    @IsBoolean()
    isActive?:boolean;

    @IsOptional()
    @Type(()=>Number)
    @IsInt()
    @Min(1)
    page=1;

    @IsOptional()
    @Type(()=>Number)
    @IsInt()
    @Min(1)
    limit=10;




}