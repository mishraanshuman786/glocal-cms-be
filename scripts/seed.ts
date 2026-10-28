
import "./load-env";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import {
  permissions,
  rolePermissions,
  roles,
  users,
} from "../src/database/schema";

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!databaseUrl || !adminEmail || !adminPassword) {
    throw new Error(
      "DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD must be configured.",
    );
  }

  if (adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // 1. Create or find the protected built-in Admin role.
    await db
      .insert(roles)
      .values({
        name: "ADMIN",
        description: "Built-in system administrator",
        isSystem: true,
        isActive: true,
      })
      .onConflictDoNothing({ target: roles.name });

    const [adminRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "ADMIN"))
      .limit(1);

    if (!adminRole || !adminRole.isSystem) {
      throw new Error(
        "ADMIN role is missing or is not marked as a system role.",
      );
    }

    // 2. Define the initial CRM permission catalogue.
    const permissionCatalogue = [
      ["dashboard", "view"],
      ["leads", "view"],
      ["leads", "create"],
      ["leads", "edit"],
      ["leads", "delete"],
      ["leads", "export"],
      ["leads", "assign"],
      ["pipeline", "view"],
      ["pipeline", "edit"],
      ["follow_ups", "view"],
      ["follow_ups", "create"],
      ["follow_ups", "edit"],
      ["follow_ups", "delete"],
      ["quotations", "view"],
      ["quotations", "create"],
      ["quotations", "edit"],
      ["quotations", "delete"],
      ["quotations", "export"],
      ["bookings", "view"],
      ["bookings", "create"],
      ["bookings", "edit"],
      ["bookings", "delete"],
      ["bookings", "export"],
      ["hotels_vehicles", "view"],
      ["hotels_vehicles", "create"],
      ["hotels_vehicles", "edit"],
      ["hotels_vehicles", "delete"],
      ["payments", "view"],
      ["payments", "create"],
      ["payments", "edit"],
      ["payments", "export"],
      ["post_trip_reviews", "view"],
      ["post_trip_reviews", "create"],
      ["post_trip_reviews", "edit"],
      ["masters", "view"],
      ["masters", "create"],
      ["masters", "edit"],
      ["masters", "delete"],
      ["users", "view"],
      ["users", "create"],
      ["users", "edit"],
      ["users", "delete"],
      ["users", "assign"],
      ["roles", "view"],
      ["roles", "create"],
      ["roles", "edit"],
      ["roles", "delete"],
      ["reports", "view"],
      ["reports", "export"],
      ["settings", "view"],
      ["settings", "edit"],
    ] as const;

    // 3. Insert permissions without duplicating existing keys.
    await db
      .insert(permissions)
      .values(
        permissionCatalogue.map(([module, action]) => ({
          module,
          action,
          key: `${module}:${action}`,
        })),
      )
      .onConflictDoNothing({ target: permissions.key });

    // 4. Give the Admin role ALL scope for every catalogue entry.
    const existingPermissions = await db.select().from(permissions);

    const permissionByKey = new Map(
      existingPermissions.map((permission) => [
        permission.key,
        permission,
      ]),
    );

    const adminGrants = permissionCatalogue.map(([module, action]) => {
      const key = `${module}:${action}`;
      const permission = permissionByKey.get(key);

      if (!permission) {
        throw new Error(`Permission was not created: ${key}`);
      }

      return {
        roleId: adminRole.id,
        permissionId: permission.id,
        scope: "ALL" as const,
      };
    });

    await db
      .insert(rolePermissions)
      .values(adminGrants)
      .onConflictDoNothing();

    // 5. Create the initial Admin employee.
    // Never overwrite an existing user's password automatically.
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, adminEmail))
      .limit(1);

    if (existingAdmin) {
      if (existingAdmin.roleId !== adminRole.id) {
        throw new Error(
          "ADMIN_EMAIL already belongs to another role. " +
            "Resolve this account explicitly before continuing.",
        );
      }

      console.log("Admin user already exists; password was not changed.");
    } else {
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      await db.insert(users).values({
        name: "Glocal Holiday Admin",
        email: adminEmail,
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
      });

      console.log("Initial Admin user created.");
    }

    console.log("Seed completed successfully.");
    console.log(`Admin role: ${adminRole.name}`);
    console.log(`Permissions processed: ${permissionCatalogue.length}`);
  } finally {
    await pool.end();
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
