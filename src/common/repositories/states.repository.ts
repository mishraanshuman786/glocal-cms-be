import { Injectable } from '@nestjs/common';
import { and, eq, asc, count, ilike, sql } from 'drizzle-orm';

import { DatabaseService } from '../../database/database.service';
import { districts, states } from '../../database/schema';

import type { CreateStateDto, ListStatesDto } from '../dto/states.dto';

@Injectable()
export class StatesRepository {
  constructor(private readonly database: DatabaseService) {}

  private get db() {
    return this.database.db;
  }

  async create(payload: CreateStateDto) {
    const [state] = await this.db
      .insert(states)
      .values({
        name: payload.name,
        region: payload.region,
      })
      .returning();

    return state;
  }

  async findByName(name: string) {
    const [state] = await this.db
      .select()
      .from(states)
      .where(ilike(states.name, name))
      .limit(1);

    return state ?? null;
  }

  async findById(id: string) {
    const [state] = await this.db
      .select()
      .from(states)
      .where(eq(states.id, id))
      .limit(1);

    return state ?? null;
  }

  async findAll(query: ListStatesDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.search?.trim()) {
      conditions.push(ilike(states.name, `%${query.search.trim()}%`));
    }

    if (query.region && query.region !== 'ALL') {
      conditions.push(eq(states.region, query.region as any));
    }

    if (query.isActive !== undefined && query.isActive !== null) {
      conditions.push(eq(states.isActive, query.isActive));
    }

    const whereCondition = conditions.length ? and(...conditions) : undefined;

    const data = await this.db
      .select({
        id: states.id,
        name: states.name,
        region: states.region,
        isActive: states.isActive,
        createdAt: states.createdAt,
        updatedAt: states.updatedAt,
        districtCount: sql<number>`count(${districts.id})::int`,
      })
      .from(states)
      .leftJoin(districts, eq(districts.stateId, states.id))
      .where(whereCondition)
      .groupBy(states.id)
      .orderBy(asc(states.name))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await this.db
      .select({ total: count() })
      .from(states)
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

  async updateStatus(id: string, isActive: boolean) {
    const [updateStatus] = await this.db
      .update(states)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(states.id, id))
      .returning();
    return updateStatus ?? null;
  }

  async getSummary() {
    const [stateStats] = await this.db
      .select({
        totalStates: count(),
        inactiveStates: sql<number>`count(*) filter (where ${states.isActive}=false)::int`,
      })
      .from(states);

    const [districtStats] = await this.db
      .select({
        totalDistricts: count(),
      })
      .from(districts);

    return {
      totalStates: Number(stateStats.totalStates),
      totalDistricts: Number(districtStats.totalDistricts),
      inactiveStates: Number(stateStats.inactiveStates),
    };
  }
}
