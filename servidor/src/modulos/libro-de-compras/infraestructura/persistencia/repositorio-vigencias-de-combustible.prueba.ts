/**
 * Prueba de integración contra PostgreSQL (base de pruebas): `enUso` de una vigencia de combustible mira las
 * líneas de los documentos vigentes, y una vigencia aplicada en una línea no se elimina.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { RecursoEnUso } from '../../../core/compartido/aplicacion/errores.js';
import { Identificador } from '../../../core/compartido/dominio/identificador.js';
import { interpretarErrorDePostgres } from '../../../core/compartido/infraestructura/errores-de-postgres.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import type { VigenciaDeCombustibleId } from '../../dominio/vigencia-de-combustible.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  documentoValido,
  errorDePostgres,
  insertarDocumento,
  lineaValida,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';
import { lineasDeDocumento } from './lineas-de-documento.tablas.js';
import { RepositorioVigenciasDeCombustibleDrizzle } from './repositorio-vigencias-de-combustible.drizzle.js';
import { vigenciasDeCombustible } from './vigencias-de-combustible.tablas.js';

let e: Escenario;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const repositorio = new RepositorioVigenciasDeCombustibleDrizzle();
const enUso = (vigenciaId: string) =>
  enTransaccionSegura(enA1(), () =>
    repositorio.enUso(Identificador.desde<'VigenciaDeCombustible'>(vigenciaId) as VigenciaDeCombustibleId),
  );

const COMBUSTIBLE = {
  galones: '10',
  idpPorGalon: '4.70',
  porcentajeDeEtanol: '0',
  idp: '47',
  base: '53',
  total: '112',
};

/** Un documento de la fecha dada con una línea que aplica la vigencia de la empresa A1. */
async function documentoConCombustible(fechaEmision: string): Promise<string> {
  const documentoId = await insertarDocumento(
    documentoValido(e, { fechaEmision, fechaRecepcion: fechaEmision }),
    enA1(),
  );
  const linea = lineaValida(e, documentoId, { ...COMBUSTIBLE, vigenciaDeCombustibleId: e.vigenciaA1 });
  await enTransaccionSegura(enA1(), (tx) => tx.insert(lineasDeDocumento).values(linea));
  return documentoId;
}

beforeAll(async () => {
  e = await prepararEscenario('vigenciaenuso');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('vigencias de combustible: en uso por documentos', () => {
  it('sin líneas que la apliquen no está en uso', async () => {
    expect(await enUso(e.vigenciaA1)).toBeNull();
  });

  it('devuelve la fecha de emisión más reciente de los documentos que la usan', async () => {
    await documentoConCombustible('2026-03-20');
    await documentoConCombustible('2026-03-05');

    expect(await enUso(e.vigenciaA1)).toEqual({ ultimaFechaDeEmision: '2026-03-20' });
  });

  it('los documentos anulados no cuentan', async () => {
    const reciente = await documentoConCombustible('2026-03-28');
    const anulacion = {
      estado: 'anulado' as const,
      anuladoEn: new Date(),
      anuladoPor: e.usuarioId,
      motivoDeAnulacion: 'Error',
    };
    await enTransaccionSegura(enA1(), (tx) => tx.update(documentos).set(anulacion).where(eq(documentos.id, reciente)));

    expect(await enUso(e.vigenciaA1)).toEqual({ ultimaFechaDeEmision: '2026-03-20' });
  });

  it('una vigencia aplicada en una línea ya no se elimina', async () => {
    const intento = enTransaccionSegura(enA1(), (tx) =>
      tx.delete(vigenciasDeCombustible).where(eq(vigenciasDeCombustible.id, e.vigenciaA1)),
    );

    const error = await errorDePostgres(intento);
    expect(error?.code).toBe('23503');
    expect(interpretarErrorDePostgres(error)).toBeInstanceOf(RecursoEnUso);
  });
});
