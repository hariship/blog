import postgres from 'postgres'
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

let _db: PostgresJsDatabase<typeof schema> | null = null

export function getDb() {
  if (!_db) {
    const client = postgres(process.env.DATABASE_URL!, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    })
    _db = drizzle(client, { schema })
  }
  return _db
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop]
  }
})
