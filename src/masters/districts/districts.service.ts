import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DistrictsRepository } from "../../common/repositories/districts.repository";
import { StatesRepository } from "../../common/repositories/states.repository";

import type { CreateDistrictDto, ListDistrictsDto, UpdateDistrictDto, CreateDistrictsBulkDto } from "../../common/dto/districts.dto";

@Injectable()
export class DistrictsService{
    constructor(
        private readonly districtsRepository: DistrictsRepository,
        private readonly statesRepository: StatesRepository
    ){}

     private isDatabaseError(
    error: unknown,
    code: string,
  ): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === code
    );
  }

  async create(dto: CreateDistrictDto){
    const state=await this.statesRepository.findById(dto.stateId);

    if(!state){
        throw new NotFoundException("State not found.");

    }

    const existingDistrict=await this.districtsRepository.findByName(dto.name, dto.stateId);

    if(existingDistrict){
        throw new ConflictException("A dictrict with this name already exists in this state.");
    }

    try{
        return await this.districtsRepository.create(dto);


    }catch(error){
        if(this.isDatabaseError(error, "23505")){
            throw new ConflictException("A district with this name already exists in this state")
        }

        throw error;
    }

  }

  async createMany(dto: CreateDistrictsBulkDto) {
  const normalizedNames = dto.districts.map((item) =>
    item.name.trim(),
  );

  const uniqueNames = new Set(
    normalizedNames.map((name) => name.toLowerCase()),
  );

  if (uniqueNames.size !== normalizedNames.length) {
    throw new BadRequestException(
      'Duplicate district names are not allowed.',
    );
  }

  const state = await this.statesRepository.findById(dto.stateId);

  if (!state) {
    throw new NotFoundException('State not found.');
  }

  const districts = await this.districtsRepository.createMany(
    dto.stateId,
    dto.districts,
  );

  return {
    success: true,
    message: 'Districts created successfully',
    data: districts,
  };
}

  async findAll(query: ListDistrictsDto){
    return this.districtsRepository.findAll({
        search: query.search,
        stateId: query.stateId,
        isActive: query.isActive,
        page: query.page,
        limit: query.limit

    })

  }

  async findOne(id:string){
    const district=await this.districtsRepository.findById(id);

    if(!district){
        throw new NotFoundException("District not found");
    }

    return district;

  }

  async update(id:string, dto: UpdateDistrictDto){
    await this.findOne(id);

    if(dto.name=== undefined &&
        dto.stateId=== undefined && 
        dto.isActive=== undefined
    ){
        throw new BadRequestException("At least one field is required to update the district");
    }

    const currentDistrict=await this.findOne(id);
    const targetStateId=dto.stateId ?? currentDistrict.stateId;
    const targetName=dto.name ?? currentDistrict.name;

    if(dto.stateId !== undefined){
        const state=await this.statesRepository.findById(dto.stateId);

        if(!state){
            throw new NotFoundException("State Not Found");
        }
    }

    const existingDistrict=await this.districtsRepository.findByName(targetName, targetStateId);

    if(existingDistrict && existingDistrict.id!==id){
        throw new ConflictException("A district with this name already exists in this state.");

    }

    try{

        const updatedDistrict=await this.districtsRepository.update(id, dto);

        if(!updatedDistrict){
            throw new NotFoundException("District not found");
        }

        return updatedDistrict;
    }catch(error){
        if(this.isDatabaseError(error, "23505")){
            throw new ConflictException("A district with this name already exists in this state.")
        }

        throw error;
    }

  }


  async updateStatus(id:string, isActive:boolean){
    await this.findOne(id);

    const updatedDistrict=await this.districtsRepository.updateStatus(id, isActive);

    if(!updatedDistrict){
        throw new NotFoundException("District not found");
    }

    return updatedDistrict;

  }

  async delete(id: string) {
  await this.findOne(id);

  try {
    const deletedDistrict =
      await this.districtsRepository.delete(id);

    if (!deletedDistrict) {
      throw new NotFoundException("District not found");
    }

    return deletedDistrict;
  } catch (error) {
    if (this.isDatabaseError(error, "23503")) {
      throw new ConflictException(
        "This district cannot be deleted because it is being used by other records",
      );
    }

    throw error;
  }
}
}