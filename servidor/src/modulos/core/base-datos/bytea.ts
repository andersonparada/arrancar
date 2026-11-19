import { customType } from 'drizzle-orm/pg-core';

/** Columna `bytea` como `Buffer` (secretos cifrados, vectores de inicio). */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});
