import pg from 'pg';
import { configuracion } from '../../../configuracion.js';
import { definicionesModulos } from '../../indice.js';
import { grupoConexiones } from './conexion.js';
import { migrarModulos } from './migrador.js';

/** Código de error de PostgreSQL de una consulta que falla; `undefined` si no falló. */
export async function codigoDeError(consulta: Promise<unknown>): Promise<string | undefined> {
  try {
    await consulta;
    return undefined;
  } catch (error) {
    return (error as { code?: string }).code;
  }
}

/** Nombre de la restricción que rechazó una consulta; `undefined` si no falló. */
export async function restriccionDeError(consulta: Promise<unknown>): Promise<string | undefined> {
  try {
    await consulta;
    return undefined;
  } catch (error) {
    return (error as { constraint?: string }).constraint;
  }
}

interface TipoDeCambioDePrueba {
  moneda: string;
  fecha: string;
  referencia?: string;
}

/**
 * Datos de las pruebas de los tipos de cambio del núcleo: dos conexiones (el dueño de la base y la aplicación), un
 * usuario, una consulta y las monedas del Banguat 24 (euro), 9 (libra) y 3 (yen), que ya trae la migración. Todo se borra al terminar.
 */
export class EscenarioDeMultimoneda {
  propietario!: pg.Client;
  aplicacion!: pg.Client;
  usuarioId!: string;
  consultaId!: string;

  async preparar(): Promise<void> {
    await migrarModulos(configuracion.DATABASE_URL_PROPIETARIO!, definicionesModulos);
    this.propietario = new pg.Client({ connectionString: configuracion.DATABASE_URL_PROPIETARIO });
    this.aplicacion = new pg.Client({ connectionString: configuracion.DATABASE_URL });
    await this.propietario.connect();
    await this.aplicacion.connect();
    await this.limpiar();
    this.usuarioId = await this.unaFila(
      `insert into core.usuarios (usuario, nombres, hash_contrasena) values ('multimonedacore', 'M', 'x') returning id`,
    );
    this.consultaId = await this.unaFila(
      `insert into core.consultas_al_banguat (iniciada_en, terminada_en, operacion, vuelta, moneda, resultado)
       values (now(), now(), 'TipoCambioRangoMoneda', 'manana', 'EUR', 'exito') returning id`,
    );
  }

  async limpiar(): Promise<void> {
    const { propietario } = this;
    await propietario.query(`delete from core.tipos_de_cambio where moneda in ('EUR', 'GBP')`);
    await propietario.query(`delete from core.consultas_al_banguat where moneda in ('EUR', 'GBP') or detalle = 'x'`);
    await propietario.query(`update core.monedas set codigo_banguat = null where codigo in ('EUR', 'GBP')`);
    await propietario.query(`delete from core.usuarios where usuario = 'multimonedacore'`);
  }

  async cerrar(): Promise<void> {
    await this.limpiar();
    await this.propietario.end();
    await this.aplicacion.end();
    await grupoConexiones.end();
  }

  async unaFila(consulta: string, valores: unknown[] = []): Promise<string> {
    return (await this.propietario.query<{ id: string }>(consulta, valores)).rows[0]!.id;
  }

  /** Una fila `banguat` con el código 24 (o el indicado), en quetzales por unidad, y la consulta del escenario. */
  tipoDelBanguat({ moneda, fecha, referencia = '8.81' }: TipoDeCambioDePrueba, codigo = 24) {
    return this.propietario.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, origen, codigo_banguat, consulta_id, convencion)
       values ($1, $2, $3, 'banguat', $4, $5, 'quetzales_por_unidad')`,
      [moneda, fecha, referencia, codigo, this.consultaId],
    );
  }

  /** Una fila `manual` de soporte; `motivo` en `null` prueba la restricción. */
  tipoManual({ moneda, fecha, referencia = '8.8' }: TipoDeCambioDePrueba, motivo: string | null = 'Corrección') {
    return this.propietario.query(
      `insert into core.tipos_de_cambio (moneda, fecha, referencia, origen, motivo, registrado_por)
       values ($1, $2, $3, 'manual', $4, $5)`,
      [moneda, fecha, referencia, motivo, this.usuarioId],
    );
  }
}
