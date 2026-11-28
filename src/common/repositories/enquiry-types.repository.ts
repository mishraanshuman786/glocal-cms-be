import { Injectable } from "@nestjs/common";
import {and, count, desc, eq, ilike, ne, SQL, sql} from "drizzle-orm";

import { DatabaseService } from "../../database/database.service";
import { enquiryTypes } from "../../database/schema";

import type { CreateEnquiryTypeDto, UpdateEnquiryTypeDto, GetEnquiryTypesDto } from "../dto/enquiry-type.dto";

@Injectable()
export class EnquiryTypesRepository{
    constructor(private readonly database:DatabaseService){}

    async findById(id:string){
        const [result]=await this.database.db.select().from(enquiryTypes).where(eq(enquiryTypes.id, id)).limit(1);

        return result ?? null;
    }

    async findByName(name:string, excludeId?:string){
        const conditions=[
            sql`lower(${enquiryTypes.name})=lower(${name})`,
        ];

        if(excludeId){
            conditions.push(ne(enquiryTypes.id, excludeId));
        }

        const [result]=await this.database.db.select().from(enquiryTypes).where(and(...conditions)).limit(1);

        return result ?? null;

    }

    async create(payload:CreateEnquiryTypeDto){
        const result=await this.database.db.insert(enquiryTypes).values({
              name: payload.name.trim(),
        color: payload.color.toUpperCase(),
        isActive: payload.isActive ?? true,
        }).returning();

        return result;
        
    }

    async findAll(query:GetEnquiryTypesDto){
        const {
      search,
      isActive,
      page = 1,
      limit = 10,
    } = query;

    const conditions: SQL[] = [];

    if (search?.trim()) {
      conditions.push(
        ilike(enquiryTypes.name, `%${search.trim()}%`),
      );
    }

    if (isActive !== undefined) {
      conditions.push(eq(enquiryTypes.isActive, isActive));
    }

    const whereCondition = conditions.length
      ? and(...conditions)
      : undefined;

    const offset = (page - 1) * limit;

    const [data, countResult] = await Promise.all([
      this.database.db
        .select()
        .from(enquiryTypes)
        .where(whereCondition)
        .orderBy(desc(enquiryTypes.createdAt))
        .limit(limit)
        .offset(offset),

      this.database.db
        .select({ total: count() })
        .from(enquiryTypes)
        .where(whereCondition),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

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

     async update(id: string, payload: UpdateEnquiryTypeDto) {
    const updateData: {
      name?: string;
      color?: string;
      isActive?: boolean;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    if (payload.name !== undefined) {
      updateData.name = payload.name.trim();
    }

    if (payload.color !== undefined) {
      updateData.color = payload.color.toUpperCase();
    }

    if(payload.isActive !== undefined){
        updateData.isActive= payload.isActive;
    }

    const [result] = await this.database.db
      .update(enquiryTypes)
      .set(updateData)
      .where(eq(enquiryTypes.id, id))
      .returning();

    return result ?? null;
  }

//   async updateStatus(id: string, isActive: boolean) {
//     const [result] = await this.database.db
//       .update(enquiryTypes)
//       .set({
//         isActive,
//         updatedAt: new Date(),
//       })
//       .where(eq(enquiryTypes.id, id))
//       .returning();

//     return result ?? null;
//   }

  async delete(id: string) {
    const [result] = await this.database.db
      .delete(enquiryTypes)
      .where(eq(enquiryTypes.id, id))
      .returning();

    return result ?? null;
  }
}