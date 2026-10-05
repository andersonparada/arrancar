/**
 * Prueba de integración contra PostgreSQL (base de pruebas): la unicidad de los documentos vigentes entre
 * empresas y entre cuentas, y el mensaje genérico de los tres únicos.
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { RecursoDuplicado } from '../../../core/compartido/aplicacion/errores.js';
import { interpretarErrorDePostgres } from '../../../core/compartido/infraestructura/errores-de-postgres.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import { documentos } from './documentos.tablas.js';
import {
  contextoDe,
  documentoValido,
  errorDePostgres,
  insertarDocumento,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';

let e: Escenario;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enA2 = () => contextoDe(e, e.empresaA2, e.cuentaA);
const enB = () => contextoDe(e, e.empresaB, e.cuentaB);
const crear = (cambios: Record<string, unknown> = {}, contexto = enA1()) =>
  insertarDocumento(documentoValido(e, { empresaId: contexto.empresaId, ...cambios }), contexto);

const MENSAJE = 'Ese documento ya está registrado.';
const MARCADO = { nitEmisor: '7654321', serie: 'F', numero: '100' };
const DESMARCADO = {
  tipo: 'recibo',
  muestraEnReportesSat: false,
  motivoFueraDelLibro: 'sin_fel',
  nitEmisor: null,
  serie: null,
  autorizacionFel: null,
  numero: 'R1',
  iva: '0',
  base: '112',
};

function exigirMensajeGenerico(error: Awaited<ReturnType<typeof errorDePostgres>>, restriccion: string): void {
  expect(error?.code).toBe('23505');
  expect(error?.constraint).toBe(restriccion);
  expect(interpretarErrorDePostgres(error)).toBeInstanceOf(RecursoDuplicado);
  expect(interpretarErrorDePostgres(error)?.message).toBe(MENSAJE);
}

beforeAll(async () => {
  e = await prepararEscenario('unicidad');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('documentos marcados: únicos en toda la instalación', () => {
  it('el mismo NIT, tipo, serie y número en otra empresa de la cuenta se rechaza', async () => {
    await crear(MARCADO);

    exigirMensajeGenerico(await errorDePostgres(crear(MARCADO, enA2())), 'documentos_sat_unico');
  });

  it('también en otra cuenta, y el mensaje no dice dónde está', async () => {
    const deOtraCuenta = crear({ ...MARCADO, proveedorId: e.proveedorB }, enB());

    exigirMensajeGenerico(await errorDePostgres(deOtraCuenta), 'documentos_sat_unico');
  });

  it('la misma autorización de la FEL se rechaza aunque cambie el número', async () => {
    const primero = documentoValido(e);
    await insertarDocumento(primero, enA1());
    const repetido = crear({ autorizacionFel: primero.autorizacionFel, numero: 'OTRO' }, enA2());

    exigirMensajeGenerico(await errorDePostgres(repetido), 'documentos_autorizacion_fel_unica');
  });

  it('un anulado libera el número', async () => {
    const original = await crear({ nitEmisor: '1111111', serie: 'L', numero: '1' });
    const anulacion = {
      estado: 'anulado' as const,
      anuladoEn: new Date(),
      anuladoPor: e.usuarioId,
      motivoDeAnulacion: 'Error',
      causaDeAnulacion: 'error_de_captura' as const,
    };
    await enTransaccionSegura(enA1(), (tx) => tx.update(documentos).set(anulacion).where(eq(documentos.id, original)));

    await expect(crear({ nitEmisor: '1111111', serie: 'L', numero: '1' })).resolves.toBeTruthy();
  });
});

describe('documentos desmarcados: únicos por proveedor dentro de la empresa', () => {
  it('el mismo proveedor, tipo, serie y número en la misma empresa se rechaza', async () => {
    await crear(DESMARCADO);

    exigirMensajeGenerico(await errorDePostgres(crear(DESMARCADO)), 'documentos_del_proveedor_unico');
  });

  it('otra empresa de la misma cuenta puede repetirlo', async () => {
    await expect(crear(DESMARCADO, enA2())).resolves.toBeTruthy();
  });

  it('otro proveedor de la empresa puede repetirlo', async () => {
    await expect(crear({ ...DESMARCADO, proveedorId: e.proveedorA2 })).resolves.toBeTruthy();
  });

  it('un anulado libera el número', async () => {
    const original = await crear({ ...DESMARCADO, numero: 'R2' });
    const anulacion = {
      estado: 'anulado' as const,
      anuladoEn: new Date(),
      anuladoPor: e.usuarioId,
      motivoDeAnulacion: 'Error',
      causaDeAnulacion: 'error_de_captura' as const,
    };
    await enTransaccionSegura(enA1(), (tx) => tx.update(documentos).set(anulacion).where(eq(documentos.id, original)));

    await expect(crear({ ...DESMARCADO, numero: 'R2' })).resolves.toBeTruthy();
  });
});
