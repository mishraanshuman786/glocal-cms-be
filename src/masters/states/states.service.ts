
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { StatesRepository } from "../../common/repositories/states.repository";
import { CreateStateDto, ListStatesDto } from "../../common/dto/states.dto";

@Injectable()
export class StatesService {
  constructor(
    private readonly statesRepository: StatesRepository,
  ) {}

  async create(dto: CreateStateDto) {
    const existingState = await this.statesRepository.findByName(
      dto.name,
    );

    if (existingState) {
      throw new ConflictException(
        "A state with this name already exists",
      );
    }

    try {
      return await this.statesRepository.create(dto);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ConflictException(
          "A state with this name already exists",
        );
      }

      throw error;
    }
  }

  async findAll(query: ListStatesDto) {
    return this.statesRepository.findAll({
      search: query.search,
      region: query.region,
      isActive: query.isActive,
      page: query.page,
      limit: query.limit,
    });
  }

  async findOne(id: string) {
    const state = await this.statesRepository.findById(id);

    if (!state) {
      throw new NotFoundException("State not found");
    }

    return state;
  }

  async updateStatus(
    id: string,
    isActive: boolean
  ) {
    await this.findOne(id);

    const updatedState = await this.statesRepository.updateStatus(
      id,
      isActive,
    );

    if (!updatedState) {
      throw new NotFoundException("State not found");
    }

    return updatedState;
  }

  async getSummary() {
    return this.statesRepository.getSummary();
  }
}
