import { sql } from 'drizzle-orm';

/**
 * El `creado_en` de lo que se guarda en un movimiento del activo es la hora real del momento (`clock_timestamp`) y no la
 * de inicio de la transacción (`now`): así el orden entre filas de la misma operación y entre operaciones que esperaron el
 * candado del activo es el orden en que de verdad se guardaron (§6.11, I-9).
 */
export const horaReal = () => sql`clock_timestamp()`;
