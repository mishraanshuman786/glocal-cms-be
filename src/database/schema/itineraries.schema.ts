import {pgEnum, pgTable, uuid, varchar, timestamp, integer, index} from "drizzle-orm/pg-core";

import { users } from "./users.schema";

export const itineraryStatusEnum=pgEnum('itinerary_status',[
"DRAFT",
"ACTIVE",
"INACTIVE"
]);

export const itineraries=pgTable('itineraries',{
    id:uuid("id").defaultRandom().primaryKey(),
    title: varchar("title",{length:200}).notNull(),
    status:itineraryStatusEnum("status").notNull().default("ACTIVE"),
    createdBy: uuid("created_by").references(()=>users.id,{onDelete:'set null'}),
    updatedBy: uuid("updated_by").references(()=>users.id,{onDelete:'set null'}),
    createdAt:timestamp('created_at',{withTimezone:true}).notNull().defaultNow(),
    updatedAt:timestamp("upsated_at",{withTimezone:true}).notNull().defaultNow()
},(table)=>[
    index('itineraries_status_idx').on(table.status),
    index('itineraries_created_at_idx').on(table.createdAt)
]);


export const itineraryDays=pgTable("itinerary_days",{
       id:uuid("id").defaultRandom().primaryKey(),
       itineraryId:uuid("itinerary_id").notNull().references(()=>itineraries.id,{onDelete:"cascade"}),
       dayNumber:integer("day_number").notNull(),
       title:varchar("title",{length:200}).notNull(),
       createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),

},(table)=>[
    index('itinerary_days_itinerary_id_idx').on(table.itineraryId)
]);

export const itineraryActivities=pgTable('itinerary_activites',{
     id:uuid("id").defaultRandom().primaryKey(),
     dayId:uuid("day_id").notNull().references(()=>itineraryDays.id,{onDelete:'cascade'}),
     title:varchar("title",{length:500}).notNull(),
     activityOrder:integer("activity_order").notNull(),
     createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow()
},(table)=>[
   index("itinerary_activities_day_id_idx").on(table.dayId)
]);