import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, asc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import {
  itineraries,
  itineraryDays,
  itineraryActivities,
} from '../../database/schema';

interface ListItinerariesParams {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  page: number;
  limit: number;
}

interface CreateItineraryData {
  title: string;
  status?: 'ACTIVE' | 'INACTIVE';
  createdBy?: string;
  days: {
    dayNumber: number;
    title: string;
    activities: {
      title: string;
      order: number;
    }[];
  }[];
}

@Injectable()
export class ItineraryRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAll(params: ListItinerariesParams) {
    const { search, status, page, limit } = params;

    const conditions = [];

    if (search?.trim()) {
      conditions.push(ilike(itineraries.title, `%${search.trim()}%`));
    }

    if (status) {
      conditions.push(eq(itineraries.status, status));
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const offset = (page - 1) * limit;

    // 1. Fetch paginated itineraries with summary counts.
    const [rows, totalResult] = await Promise.all([
      this.database.db
        .select({
          id: itineraries.id,
          title: itineraries.title,
          status: itineraries.status,
          createdAt: itineraries.createdAt,
          updatedAt: itineraries.updatedAt,

          durationsDays: sql<number>`
          count(distinct ${itineraryDays.id})::int
        `,

          totalActivities: sql<number>`
          count(distinct ${itineraryActivities.id})::int
        `,
        })
        .from(itineraries)
        .leftJoin(itineraryDays, eq(itineraries.id, itineraryDays.itineraryId))
        .leftJoin(
          itineraryActivities,
          eq(itineraryDays.id, itineraryActivities.dayId),
        )
        .where(where)
        .groupBy(itineraries.id)
        .orderBy(desc(itineraries.updatedAt))
        .limit(limit)
        .offset(offset),

      this.database.db
        .select({
          total: count(),
        })
        .from(itineraries)
        .where(where),
    ]);

    const total = totalResult[0]?.total ?? 0;

    // 2. Get itinerary IDs from the current page.
    const itineraryIds = rows.map((item) => item.id);

    // 3. Fetch day previews for the current page.
    const dayRows = itineraryIds.length
      ? await this.database.db
          .select({
            id: itineraryDays.id,
            itineraryId: itineraryDays.itineraryId,
            dayNumber: itineraryDays.dayNumber,
            title: itineraryDays.title,
          })
          .from(itineraryDays)
          .where(inArray(itineraryDays.itineraryId, itineraryIds))
          .orderBy(asc(itineraryDays.dayNumber))
      : [];

    // 4. Group days by itinerary ID.
    const daysByItinerary = new Map<
      string,
      {
        id: string;
        dayNumber: number;
        title: string;
      }[]
    >();

    for (const day of dayRows) {
      const existingDays = daysByItinerary.get(day.itineraryId) ?? [];

      existingDays.push({
        id: day.id,
        dayNumber: day.dayNumber,
        title: day.title,
      });

      daysByItinerary.set(day.itineraryId, existingDays);
    }

    // 5. Attach day previews to each itinerary.
    const data = rows.map((item) => ({
      ...item,
      days: (daysByItinerary.get(item.id) ?? []).slice(0, 2),
    }));

    // 6. Return paginated response.
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

  async findById(id: string) {
    const [itinerary] = await this.database.db
      .select()
      .from(itineraries)
      .where(eq(itineraries.id, id))
      .limit(1);

    if (!itinerary) {
      throw new NotFoundException('Itinerary Not Found!');
    }

    const days = await this.database.db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.itineraryId, id))
      .orderBy(itineraryDays.dayNumber);

    const dayIds = days.map((day) => day.id);

    const activities = dayIds.length
      ? await this.database.db
          .select()
          .from(itineraryActivities)
          .where(inArray(itineraryActivities.dayId, dayIds))
          .orderBy(itineraryActivities.activityOrder)
      : [];

    return {
      ...itinerary,
      durationDays: days.length,
      totalActivities: activities.length,
      days: days.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        title: day.title,
        activities: activities
          .filter((activity) => activity.dayId === day.id)
          .map((activity) => ({
            id: activity.id,
            title: activity.title,
            order: activity.activityOrder,
          })),
      })),
    };
  }

  async create(data: CreateItineraryData) {
    return this.database.db.transaction(async (tx) => {
      const [itinerary] = await tx
        .insert(itineraries)
        .values({
          title: data.title,
          status: data.status ?? 'ACTIVE',
          createdBy: data.createdBy,
          updatedBy: data.createdBy,
        })
        .returning();

      for (const day of data.days) {
        const [createdDay] = await tx
          .insert(itineraryDays)
          .values({
            itineraryId: itinerary.id,
            dayNumber: day.dayNumber,
            title: day.title,
          })
          .returning();

        if (day.activities.length) {
          await tx.insert(itineraryActivities).values(
            day.activities.map((activity) => ({
              dayId: createdDay.id,
              title: activity.title,
              activityOrder: activity.order,
            })),
          );
        }
      }
      return itinerary;
    });
  }

  async updateStatus(
    id: string,
    status: 'ACTIVE' | 'INACTIVE',
    updatedBy?: string,
  ) {
    const [updated] = await this.database.db
      .update(itineraries)
      .set({
        status,
        updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(itineraries.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException('Itinerary Not Found!');
    }

    return updated;
  }

  async copy(id: string, title: string, userId: string) {
    const original = await this.findById(id);

    return this.create({
      title: title,
      status: 'ACTIVE',
      createdBy: userId,
      days: original.days.map((day) => ({
        dayNumber: day.dayNumber,
        title: day.title,
        activities: day.activities.map((activity) => ({
          title: activity.title,
          order: activity.order,
        })),
      })),
    });
  }
}
