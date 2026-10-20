/**
 * Prueba de integración contra PostgreSQL: el control de períodos declarados (`for share` contra el `for update` de
 * declarar), el historial de declaraciones y las consultas de la revisión (documentos cambiados y bandeja).
 */
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { grupoConexiones } from '../../../core/base-datos/conexion.js';
import { enTransaccionSegura } from '../../../core/compartido/pruebas/en-transaccion-segura.js';
import type { DeclaracionNueva } from '../../aplicacion/puertos/puertos-de-periodos.js';
import { ControlDePeriodosEnBaseDeDatos } from './control-de-periodos.drizzle.js';
import { ConsultasDelPeriodoDrizzle } from './consultas-del-periodo.drizzle.js';
import {
  contextoDe,
  documentoValido,
  insertarDocumento,
  prepararEscenario,
  type Escenario,
} from './documentos.soporte.js';
import { documentos } from './documentos.tablas.js';
import { insertarDte, insertarLote } from './dte-recibidos.soporte.js';
import { periodos } from './periodos.tablas.js';
import { RepositorioDePeriodosDrizzle } from './repositorio-de-periodos.drizzle.js';

let e: Escenario;

const enA1 = () => contextoDe(e, e.empresaA1, e.cuentaA);
const enA2 = () => contextoDe(e, e.empresaA2, e.cuentaA);
const repositorio = new RepositorioDePeriodosDrizzle();
const consultas = new ConsultasDelPeriodoDrizzle();
const control = (encendido: boolean) => new ControlDePeriodosEnBaseDeDatos({ encendido: async () => encendido });
const filasDe = (contexto = enA1()) => enTransaccionSegura(contexto, (tx) => tx.select().from(periodos));

const declaracion = (periodo: string, cambios: Partial<DeclaracionNueva> = {}): DeclaracionNueva => ({
  periodo,
  evento: 'declaracion',
  formulario: 'SAT-2237',
  numeroDeFormulario: '8841',
  fechaDePresentacion: '2026-10-12',
  tipoDeLibro: 'completo',
  foto: { version: 1, tipoDeLibro: 'completo', documentos: 0, huella: 'a'.repeat(64), resumen: {} },
  diferencia: null,
  motivo: null,
  ...cambios,
});

/** Declara el período como lo hace `DeclararPeriodo`: toma la fila, agrega al historial y la marca. */
const declarar = (contexto: ReturnType<typeof enA1>, periodo: string) =>
  enTransaccionSegura(contexto, async () => {
    await repositorio.bloquear(contexto.empresaId, periodo);
    await repositorio.agregarDeclaracion(contexto.empresaId, declaracion(periodo));
    await repositorio.marcarDeclarado(contexto.empresaId, periodo, contexto.usuarioId);
  });

beforeAll(async () => {
  e = await prepararEscenario('controlperiodos');
});

afterAll(async () => {
  await grupoConexiones.end();
});

describe('control de períodos', () => {
  it('con el bloqueo apagado solo lee: no crea filas y nada bloquea', async () => {
    const apagado = control(false);

    const estado = await enTransaccionSegura(enA1(), () => apagado.estadoDe('2026-01-01', 'bloquear'));
    const bloqueados = await enTransaccionSegura(enA1(), () => apagado.bloqueados());

    expect(estado).toEqual({ periodo: '2026-01-01', declarado: false, bloquea: false, ultimaDeclaracion: null });
    expect(bloqueados).toEqual([]);
    expect(await filasDe()).toEqual([]);
  });

  it('encendido, consultar no escribe y bloquear crea la fila abierta del período', async () => {
    const encendido = control(true);

    await enTransaccionSegura(enA1(), () => encendido.estadoDe('2026-02-01', 'consultar'));
    expect(await filasDe()).toEqual([]);
    const estado = await enTransaccionSegura(enA1(), () => encendido.estadoDe('2026-02-01', 'bloquear'));

    expect(estado.declarado).toBe(false);
    expect((await filasDe()).map((fila) => [fila.periodo, fila.estado])).toEqual([['2026-02-01', 'abierto']]);
  });

  it('un período declarado bloquea con el bloqueo encendido y solo informa con el apagado', async () => {
    await declarar(enA1(), '2026-03-01');

    const conBloqueo = await enTransaccionSegura(enA1(), () => control(true).estadoDe('2026-03-01', 'consultar'));
    const sinBloqueo = await enTransaccionSegura(enA1(), () => control(false).estadoDe('2026-03-01', 'consultar'));
    const bloqueados = await enTransaccionSegura(enA1(), () => control(true).bloqueados());

    expect(conBloqueo).toMatchObject({
      declarado: true,
      bloquea: true,
      ultimaDeclaracion: { formulario: 'SAT-2237', numeroDeFormulario: '8841', fecha: '2026-10-12' },
    });
    expect(sinBloqueo).toMatchObject({ declarado: true, bloquea: false });
    expect(bloqueados).toEqual(['2026-03-01']);
  });

  it('otra empresa no ve el período declarado', async () => {
    const estado = await enTransaccionSegura(enA2(), () => control(true).estadoDe('2026-03-01', 'bloquear'));

    expect(estado.declarado).toBe(false);
    expect(await filasDe(enA2())).toHaveLength(1);
  });

  it('reabrir vuelve a admitir registros y el historial conserva todo', async () => {
    await enTransaccionSegura(enA1(), async () => {
      await repositorio.bloquear(e.empresaA1, '2026-03-01');
      await repositorio.agregarDeclaracion(
        e.empresaA1,
        declaracion('2026-03-01', {
          evento: 'reapertura',
          formulario: null,
          numeroDeFormulario: null,
          fechaDePresentacion: null,
          tipoDeLibro: null,
          foto: null,
          motivo: 'Falta una factura',
        }),
      );
      await repositorio.reabrir(e.empresaA1, '2026-03-01');
    });

    const estado = await enTransaccionSegura(enA1(), () => control(true).estadoDe('2026-03-01', 'consultar'));
    const historial = await enTransaccionSegura(enA1(), () => repositorio.historial('2026-03-01'));

    expect(estado.bloquea).toBe(false);
    expect(historial.map((fila) => [fila.secuencia, fila.evento])).toEqual([
      [1, 'declaracion'],
      [2, 'reapertura'],
    ]);
    expect(historial[0]!.creadoPor).not.toBeNull();
  });
});

/** Una promesa que otro lado cumple cuando quiere. */
function señal() {
  let avisar!: () => void;
  const espera = new Promise<void>((resolver) => (avisar = resolver));
  return { espera, avisar };
}

describe('declarar espera a los registros en curso', () => {
  it('quien declara no toma el período hasta que termina el registro que ya lo tenía con for share', async () => {
    const orden: string[] = [];
    const tomado = señal();
    const puedeTerminar = señal();
    const registro = enTransaccionSegura(enA1(), async () => {
      await control(true).estadoDe('2026-04-01', 'bloquear');
      tomado.avisar();
      await puedeTerminar.espera;
      orden.push('termina el registro');
    });
    await tomado.espera;

    const declaracionEnCurso = declarar(enA1(), '2026-04-01').then(() => orden.push('termina la declaración'));
    await new Promise((resolver) => setTimeout(resolver, 300));
    expect(orden).toEqual([]);
    puedeTerminar.avisar();
    await Promise.all([registro, declaracionEnCurso]);

    expect(orden).toEqual(['termina el registro', 'termina la declaración']);
    const despues = await enTransaccionSegura(enA1(), () => control(true).estadoDe('2026-04-01', 'bloquear'));
    expect(despues.bloquea).toBe(true);
  });
});

describe('documentos cambiados desde una declaración', () => {
  it('lista los registrados y los anulados después, y no los que no cambiaron', async () => {
    const antes = new Date('2026-05-01T00:00:00Z');
    const viejo = await insertarDocumento(
      documentoValido(e, { periodo: '2026-05-01', creadoEn: new Date('2026-04-01T00:00:00Z') }),
      enA1(),
    );
    const anulado = await insertarDocumento(
      documentoValido(e, { periodo: '2026-05-01', creadoEn: new Date('2026-04-02T00:00:00Z') }),
      enA1(),
    );
    const nuevo = await insertarDocumento(documentoValido(e, { periodo: '2026-05-01', serie: 'Z' }), enA1());
    await enTransaccionSegura(enA1(), (tx) =>
      tx
        .update(documentos)
        .set({
          estado: 'anulado',
          anuladoEn: new Date('2026-05-02T00:00:00Z'),
          anuladoPor: e.usuarioId,
          motivoDeAnulacion: 'Duplicada',
          causaDeAnulacion: 'error_de_captura',
        })
        .where(eq(documentos.id, anulado)),
    );

    const cambiados = await enTransaccionSegura(enA1(), () => consultas.documentosCambiadosDesde('2026-05-01', antes));

    expect(cambiados.map((cambio) => [cambio.documentoId, cambio.cambio]).sort()).toEqual(
      [
        [nuevo, 'registrado'],
        [anulado, 'anulado'],
      ].sort(),
    );
    expect(cambiados.map((cambio) => cambio.documentoId)).not.toContain(viejo);
  });
});

describe('DTE pendientes de la bandeja que pueden ir en el período', () => {
  const pendientes = (periodo: string, contexto = enA1()) =>
    enTransaccionSegura(contexto, () => consultas.dtePendientesQuePuedenIrEn(periodo));

  it('sin lotes de la bandeja no hay nada que avisar', async () => {
    expect(await pendientes('2026-06-01')).toBeNull();
  });

  it('un lote que no toca el período ni los dos meses anteriores tampoco cuenta', async () => {
    await insertarLote(enA1(), { emisionDesde: '2026-01-01', emisionHasta: '2026-02-28' });

    expect(await pendientes('2026-06-01')).toBeNull();
  });

  it('con un lote que toca el período cuenta los DTE pendientes emitidos desde dos meses antes hasta el fin del período', async () => {
    const loteId = await insertarLote(enA1(), { emisionDesde: '2026-04-01', emisionHasta: '2026-06-30' });
    await insertarDte(enA1(), { fechaEmision: '2026-04-15' }, loteId);
    await insertarDte(enA1(), { fechaEmision: '2026-06-30' }, loteId);
    await insertarDte(enA1(), { fechaEmision: '2026-03-31' }, loteId);
    await insertarDte(enA1(), { fechaEmision: '2026-07-01' }, loteId);

    expect(await pendientes('2026-06-01')).toBe(2);
  });

  it('otra empresa no ve los lotes ni los DTE de la primera', async () => {
    expect(await pendientes('2026-06-01', enA2())).toBeNull();
  });
});
