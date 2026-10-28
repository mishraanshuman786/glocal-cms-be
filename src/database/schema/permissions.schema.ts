import {
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { roles } from './roles.schema';

export const accessScopeEnum = pgEnum('access_scope', [
  'NONE',
  'OWN',
  'TEAM',
  'ALL',
]);

export const permissionEffectEnum = pgEnum('permission_effect', [
  'ALLOW',
  'DENY',
]);

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Examples: Leads, bookings, users, reports
  module: varchar('module', { length: 100 }).notNull(),
  // Examples: view, create, edit, delete , export, assign
  action: varchar('action', { length: 100 }).notNull(),
  // Example: leads:create
  key: varchar('key', { length: 200 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    scope: accessScopeEnum('scope').notNull().default('NONE'),
  },
  (table) => [
    unique('role_permissions_role_permission_unique').on(
      table.roleId,
      table.permissionId,
    ),
  ],
);

export const userPermissions = pgTable(
  'user_permissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    effect: permissionEffectEnum('effect').notNull(),
    scope: accessScopeEnum('scope').notNull().default('NONE'),
    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('user_permissions_user_permission_unique').on(
      table.userId,
      table.permissionId,
    ),
  ],
);
