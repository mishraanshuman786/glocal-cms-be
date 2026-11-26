import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { districts, states } from '../../database/schema';

import type {
  CreateDistrictDto,
  ListDistrictsDto,
  UpdateDistrictDto,
} from '../dto/districts.dto';
import { isAccessor } from 'typescript';

@Injectable()
export class DistrictsRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async create(payload: CreateDistrictDto) {
    const [district] = await this.db
      .insert(districts)
      .values({
        stateId: payload.stateId,
        name: payload.name,
        isActive: payload.isActive ?? true,
      })
      .returning();

    return district;
  }

  async createMany(
  stateId: string,
  items: {
    name: string;
    isActive?: boolean;
  }[],
) {
  return this.db.transaction(async (tx) => {
    return tx
      .insert(districts)
      .values(
        items.map((item) => ({
          name: item.name.trim(),
          stateId,
          isActive: item.isActive ?? true,
        })),
      )
      .returning();
  });
}

  async findByName(name: string, stateId: string) {
    const [district] = await this.db
      .select()
      .from(districts)
      .where(and(eq(districts.stateId, stateId), ilike(districts.name, name)))
      .limit(1);

    return district ?? null;
  }

  async findById(id: string) {
    const [district] = await this.db
      .select()
      .from(districts)
      .where(eq(districts.id, id))
      .limit(1);

    return district ?? null;
  }

  async findAll(query: ListDistrictsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.search?.trim()) {
      conditions.push(ilike(districts.name, `%${query.search.trim()}%`));
    }

    if (query.stateId) {
      conditions.push(eq(districts.stateId, query.stateId));
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(districts.isActive, query.isActive));
    }

    const whereCondition = conditions.length ? and(...conditions) : undefined;

    const data = await this.db
      .select({
        id: districts.id,
        name: districts.name,
        stateId: districts.stateId,
        isActive: districts.isActive,
        createdAt: districts.createdAt,
        updatedAt: districts.updatedAt,
        state: {
          id: states.id,
          name: states.name,
        },
      })
      .from(districts)
      .innerJoin(states, eq(districts.stateId, states.id))
      .where(whereCondition)
      .orderBy(asc(districts.name))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await this.db
      .select({ total: count() })
      .from(districts)
      .where(whereCondition);

    const total = Number(totalResult.total);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async update(id: string, payload: UpdateDistrictDto) {
    const [updatedDistrict] = await this.db
      .update(districts)
      .set({
        ...(payload.name !== undefined && {
          name: payload.name,
        }),
        ...(payload.stateId !== undefined && {
          stateId: payload.stateId,
        }),
        ...(payload.isActive !== undefined && {
          isActive: payload.isActive,
        }),
        updatedAt: new Date(),
      })
      .where(eq(districts.id, id))
      .returning();

    return updatedDistrict ?? null;
  }

  async updateStatus(id: string, isActive: boolean) {
    const [updatedDistrict] = await this.db
      .update(districts)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(districts.id, id))
      .returning();

    return updatedDistrict ?? null;
  }

  async delete(id: string) {
    const deletedRows = await this.db
      .delete(districts)
      .where(eq(districts.id, id))
      .returning({
        id: districts.id,
        name: districts.name,
      });

    return deletedRows[0] ?? null;
  }
}
