import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EnquiryTypesRepository } from "../../common/repositories/enquiry-types.repository";

import type { CreateEnquiryTypeDto, UpdateEnquiryTypeDto, UpdateEnquiryTypeStatusDto, GetEnquiryTypesDto } from "../../common/dto/enquiry-type.dto";

function getPostgresErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error
  ) {
    return String(error.code);
  }

  return undefined;
}

@Injectable()
export class EnquiryTypesService {
  constructor(
    private readonly enquiryTypesRepository: EnquiryTypesRepository,
  ) {}

  async create(payload: CreateEnquiryTypeDto) {
    const name = payload.name.trim();

    const existing = await this.enquiryTypesRepository.findByName(name);

    if (existing) {
      throw new ConflictException(
        "An enquiry type with this name already exists.",
      );
    }

    try {
      return await this.enquiryTypesRepository.create({
        ...payload,
        name,
      });
    } catch (error) {
      if (getPostgresErrorCode(error) === "23505") {
        throw new ConflictException(
          "An enquiry type with this name already exists.",
        );
      }

      throw error;
    }
  }

  async findAll(query: GetEnquiryTypesDto) {
    return this.enquiryTypesRepository.findAll(query);
  }

  async findOne(id: string) {
    const enquiryType = await this.enquiryTypesRepository.findById(id);

    if (!enquiryType) {
      throw new NotFoundException("Enquiry type not found.");
    }

    return enquiryType;
  }

  async update(id: string, payload: UpdateEnquiryTypeDto) {
    await this.findOne(id);

    if (payload.name !== undefined) {
      const existing = await this.enquiryTypesRepository.findByName(
        payload.name.trim(),
        id,
      );

      if (existing) {
        throw new ConflictException(
          "An enquiry type with this name already exists.",
        );
      }
    }

    try {
      const updated = await this.enquiryTypesRepository.update(
        id,
        payload,
      );

      if (!updated) {
        throw new NotFoundException("Enquiry type not found.");
      }

      return updated;
    } catch (error) {
      if (getPostgresErrorCode(error) === "23505") {
        throw new ConflictException(
          "An enquiry type with this name already exists.",
        );
      }

      throw error;
    }
  }

//   async updateStatus(
//     id: string,
//     payload: UpdateEnquiryTypeStatusDto,
//   ) {
//     await this.findOne(id);

//     const updated = await this.enquiryTypesRepository.updateStatus(
//       id,
//       payload.isActive,
//     );

//     if (!updated) {
//       throw new NotFoundException("Enquiry type not found.");
//     }

//     return updated;
//   }

  async remove(id: string) {
    await this.findOne(id);

    try {
      const deleted = await this.enquiryTypesRepository.delete(id);

      if (!deleted) {
        throw new NotFoundException("Enquiry type not found.");
      }

      return {
        id: deleted.id,
        name: deleted.name,
      };
    } catch (error) {
      // PostgreSQL 23503 = foreign-key violation.
      if (getPostgresErrorCode(error) === "23503") {
        throw new ConflictException(
          "This enquiry type cannot be deleted because it is being used by enquiries.",
        );
      }

      throw error;
    }
  }
}