import { Injectable } from '@nestjs/common';
import { ItineraryRepository } from '../../common/repositories/itinerary.repository';
import {
  CreateItineraryDto,
  ListItinerariesDto,
} from '../../common/dto/itinerary.dto';

@Injectable()
export class ItineraryService {
  constructor(private readonly itineraryRepository: ItineraryRepository) {}

  async findAll(query: ListItinerariesDto) {
    return this.itineraryRepository.findAll({
      search: query.search,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });
  }

  async findById(id: string) {
    return this.itineraryRepository.findById(id);
  }

  async create(dto: CreateItineraryDto, userId: string) {
    const title = dto.title.trim();

    const days = dto.days.map((day, dayIndex) => ({
      dayNumber: dayIndex + 1,
      title: day.title.trim(),
      activities: day.activities
        .map((activity, activityIndex) => ({
          title: activity.title.trim(),
          order: activityIndex + 1,
        }))
        .filter((activity) => activity.title.length > 0),
    }));

    return this.itineraryRepository.create({
      title,
      status: dto.status,
      createdBy: userId,
      days,
    });
  }

  async updateStatus(
    id: string,
    status: 'DRAFT' | 'ACTIVE' | 'INACTIVE',
    userId: string,
  ) {
    return this.itineraryRepository.updateStatus(id, status, userId);
  }

  async copy(id: string, userId: string) {
    return this.itineraryRepository.copy(id, userId);
  }
}
