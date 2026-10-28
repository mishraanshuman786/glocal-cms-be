import {
  pgTable,
  index,
  uuid,
  boolean,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { roles } from './roles.schema';
import { AnyPgColumn } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 150 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    // Store a secure password hash, never a plain-text password.
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    //  the employee reporting manager; optional for top-level users
    managerId: uuid('manager_id').references((): AnyPgColumn => users.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('users_role_id_idx').on(table.roleId),
    index('users_manager_id_idx').on(table.managerId),
  ],
);
