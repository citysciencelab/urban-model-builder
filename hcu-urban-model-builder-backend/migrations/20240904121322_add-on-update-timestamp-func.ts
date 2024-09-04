import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION on_update_timestamp()
    RETURNS trigger AS $$
    BEGIN
      NEW."updatedAt" = now();
      RETURN NEW;
    END;
  $$ language 'plpgsql';
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP FUNCTION on_update_timestamp')
}
