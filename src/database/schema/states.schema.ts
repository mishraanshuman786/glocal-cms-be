import {pgEnum, pgTable, uuid, varchar, boolean, timestamp, index,uniqueIndex } from "drizzle-orm/pg-core";
import {sql} from "drizzle-orm";

export const stateRegionEnum=pgEnum("state_region",[
    "NORTH",
    "SOUTH",
    "EAST",
    "WEST",
    "NORTH_EAST"
]);

export const states=pgTable(
    "state",
    {
        id:uuid().defaultRandom().primaryKey(),
        name:varchar("name",{length:150}).notNull(),
        region: stateRegionEnum("region").notNull(),
        isActive: boolean("is_active").notNull().default(true),
        createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
        updatedAt: timestamp("updated_at",{withTimezone:true}).notNull().defaultNow(),

    },
    (table)=>[
       uniqueIndex("states_name_unique").on(sql`lower(${table.name})`),
       index("states_region_idx").on(table.region),
       index("states_is_active_idx").on(table.isActive)
    ],
);

export const districts=pgTable("districts",{
    id:uuid("id").defaultRandom().primaryKey(),
    stateId:uuid("state_id").notNull().references(()=>states.id,{onDelete:"restrict"}),
    name: varchar("name",{length:150}).notNull(),
    isActive:boolean("is_active").notNull().default(true),
    createdAt:timestamp("created_at",{withTimezone:true}).notNull().defaultNow(),
    updatedAt:timestamp("updated_at",{withTimezone:true}).notNull().defaultNow()

},(table)=>[
    uniqueIndex("districts_state_name_unique").on(table.stateId,sql`lower(${table.name})`),
    index("districts_state_id_idx").on(table.stateId),
    index("districts_is_active_idx").on(table.isActive)
]);