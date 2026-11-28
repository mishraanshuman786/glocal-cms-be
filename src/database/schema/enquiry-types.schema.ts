import {pgTable, uuid, varchar, boolean, timestamp, uniqueIndex} from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";
import { time } from "console";

export const enquiryTypes=pgTable("enquiry_types",{
    id:uuid("id").defaultRandom().primaryKey(),
    name: varchar("name",{length:100}).notNull(),
    color: varchar("color",{length:7}).notNull().default("#3B82F6"),
    isActive:boolean("is_active").notNull().default(true),
    createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
    updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()
},(table)=>[
  uniqueIndex("enquiry_types_name_unique").on(sql`lower(${table.name})`)
]);