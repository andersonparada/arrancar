/**
 * Lo que la revisión del cierre de inventario encuentra: líneas en la bandeja, recepciones de documentos anulados del
 * libro, la pregunta a los demás módulos y la carga inicial abierta con saldos iniciales.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { HallazgoDeOtroModuloEnElCierre } from '../modulos/core/contratos/inventarios.contratos.js';
import { mediador } from '../modulos/core/mediador/contexto.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { cuadreDelKardex } from './soporte/cuadre-del-kardex.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { centavosDe, cerrarMes, renglonesDeFoto, revisarMes } from './soporte/escenario-de-cierres.js';
import { instalarDestinoFalso } from './soporte/escenario-de-documentos.js';
import {
  porRecibir,
  prepararRecepciones,
  recibir,
  registrarDocumento,
  renglonDeRecepcion,
  type EscenarioDeRecepciones,
} from './soporte/escenario-de-recepciones.js';
import { rutaDeCarga } from './soporte/escenario-de-saldos-de-activos.js';
import {
  cargarSaldoInicial,
  datosDeSaldoInicial,
  prepararSaldos,
} from './soporte/escenario-de-saldos-de-inventario.js';
import type { EscenarioDeKardex } from './soporte/escenario-de-kardex.js';

const entorno = usarEntornoApi();
let e: EscenarioDeRecepciones;
let facturaRecibida: string;
let otrosModulosDicen: HallazgoDeOtroModuloEnElCierre[] = [];

const propietario = () => e.cuenta.propietario;
const revision = async (periodo = '2026-10-01') => (await revisarMes(propietario(), periodo)).cuerpo;
const codigos = (hallazgos: { codigo: string }[]) => hallazgos.map((h) => h.codigo);
const ANULAR_EN_EL_LIBRO = `update libro_de_compras.documentos set estado = 'anulado', anulado_en = now(),
  anulado_por = gen_random_uuid(), motivo_de_anulacion = 'Prueba', causa_de_anulacion = 'error_de_captura' where id = $1`;
const REVIVIR_EN_EL_LIBRO = `update libro_de_compras.documentos set estado = 'vigente', anulado_en = null,
  anulado_por = null, motivo_de_anulacion = null, causa_de_anulacion = null where id = $1`;
/** Anula el documento en el libro como si el aviso no hubiera llegado, o lo deja vigente otra vez. */
const marcarLibro = (estado: 'vigente' | 'anulado') =>
  comoPropietario(estado === 'anulado' ? ANULAR_EN_EL_LIBRO : REVIVIR_EN_EL_LIBRO, [facturaRecibida]);

beforeAll(async () => {
  instalarDestinoFalso();
  e = await prepararRecepciones(entorno, 'cierreshallazgos');
  const fechas = { fechaEmision: '2026-10-10', fechaRecepcion: '2026-10-10' };
  const recibida = await registrarDocumento(e, fechas);
  facturaRecibida = recibida.documentoId;
  await registrarDocumento(e, { fechaEmision: '2026-10-11', fechaRecepcion: '2026-10-11' });
  const recepcion = await recibir(
    e,
    [renglonDeRecepcion(e, recibida.lineaIds[0]!, { cantidad: '500', monto: '1000.00' })],
    { fecha: '2026-10-12' },
  );
  expect(recepcion.estado, JSON.stringify(recepcion.cuerpo)).toBe(201);
  mediador.responder('terceros', 'inventarios.revisar_cierre_del_mes', async () =>
    otrosModulosDicen.length === 0 ? null : { nombreDelModulo: 'Módulo de prueba', hallazgos: otrosModulosDicen },
  );
});

afterAll(async () => {
  expect(await cuadreDelKardex(e.cuenta.empresaId)).toEqual([]);
});

describe('lo que encuentra Inventarios', () => {
  it('una línea que sigue en la bandeja con fecha del mes solo avisa', async () => {
    expect((await porRecibir(e)).length).toBeGreaterThan(0);

    const { hallazgos, puedeCerrar } = await revision();

    expect(puedeCerrar).toBe(true);
    expect(hallazgos).toEqual([expect.objectContaining({ nivel: 'aviso', codigo: 'lineas_por_recibir', cantidad: 1 })]);
  });

  it('una recepción vigente de una factura anulada en el libro bloquea el cierre y dice cuál es', async () => {
    await marcarLibro('anulado');

    const { hallazgos, puedeCerrar } = await revision();
    const cierre = await cerrarMes(propietario(), '2026-10-01');

    expect(puedeCerrar).toBe(false);
    expect(hallazgos[0]).toMatchObject({
      nivel: 'bloquea',
      codigo: 'recepciones_de_documentos_anulados',
      detalle: ['Recepción 1'],
    });
    expect(cierre.cuerpo.error.codigo).toBe('cierre_con_bloqueos');
    expect(codigos(cierre.cuerpo.error.detalles.hallazgos)).toContain('recepciones_de_documentos_anulados');
    await marcarLibro('vigente');
  });
});

describe('la pregunta a los demás módulos', () => {
  it('si ninguno dice nada, la revisión queda como estaba', async () => {
    expect(codigos((await revision()).hallazgos)).toEqual(['lineas_por_recibir']);
  });

  it('lo que otro módulo dice entra a la revisión: un bloqueo impide cerrar y un aviso solo informa', async () => {
    otrosModulosDicen = [
      { codigo: 'obra_sin_capitalizar', nivel: 'bloquea', mensaje: 'Hay materiales en una obra sin capitalizar.' },
      { codigo: 'nota_pendiente', nivel: 'aviso', mensaje: 'Una nota espera revisión.' },
    ];

    const { hallazgos, puedeCerrar } = await revision();
    const cierre = await cerrarMes(propietario(), '2026-10-01');

    expect(puedeCerrar).toBe(false);
    expect(hallazgos.filter((h: { modulo?: string }) => h.modulo === 'Módulo de prueba')).toEqual([
      expect.objectContaining({ nivel: 'bloquea', codigo: 'obra_sin_capitalizar' }),
      expect.objectContaining({ nivel: 'aviso', codigo: 'nota_pendiente' }),
    ]);
    expect(cierre.cuerpo.error.codigo).toBe('cierre_con_bloqueos');
    otrosModulosDicen = [];
  });

  it('sin bloqueos el mes cierra con la recepción vigente y su valor', async () => {
    const cierre = await cerrarMes(propietario(), '2026-10-01');

    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
    expect(cierre.cuerpo.valorTotal).toBe('1000.00');
    expect(centavosDe(await renglonesDeFoto(propietario(), '2026-10-01'))).toBe(100_000);
  });
});

describe('la carga inicial abierta con saldos iniciales', () => {
  let s: EscenarioDeKardex;

  beforeAll(async () => {
    s = await prepararSaldos(entorno, 'cierressaldos', { metodo: 'promedio_ponderado' });
    await cargarSaldoInicial(s.cuenta.propietario, datosDeSaldoInicial(s, '100', '250.00'));
  });

  it('bloquea el cierre hasta que se cierre la carga; luego el saldo inicial entra en la foto', async () => {
    const revisada = (await revisarMes(s.cuenta.propietario, '2026-09-01')).cuerpo;
    expect(revisada.puedeCerrar).toBe(false);
    expect(codigos(revisada.hallazgos)).toEqual(['carga_inicial_abierta']);
    expect((await cerrarMes(s.cuenta.propietario, '2026-09-01')).cuerpo.error.codigo).toBe('cierre_con_bloqueos');

    const carga = await s.cuenta.propietario.post(rutaDeCarga(s.cuenta, 'cerrar'), {});
    expect(carga.estado, JSON.stringify(carga.cuerpo)).toBe(200);

    const cierre = await cerrarMes(s.cuenta.propietario, '2026-09-01');
    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
    expect(cierre.cuerpo.valorTotal).toBe('250.00');
    expect(centavosDe(await renglonesDeFoto(s.cuenta.propietario, '2026-09-01'))).toBe(25_000);
  });

  it('con un mes cerrado, los saldos iniciales ya no se tocan', async () => {
    const otro = await s.cuenta.propietario.post(
      '/api/inventarios/saldos-iniciales',
      datosDeSaldoInicial(s, '1', '2.00'),
    );

    expect(otro.estado).toBe(422);
    expect(['saldos_con_cierres', 'carga_inicial_cerrada']).toContain(otro.cuerpo.error.codigo);
  });
});

describe('un mes cerrado con la carga todavía abierta', () => {
  it('cierra vacío si no hay saldos y desde entonces ya no se cargan saldos iniciales', async () => {
    const v = await prepararSaldos(entorno, 'cierresvacio', { metodo: 'promedio_ponderado' });

    const cierre = await cerrarMes(v.cuenta.propietario, '2026-09-01');
    const saldo = await v.cuenta.propietario.post(
      '/api/inventarios/saldos-iniciales',
      datosDeSaldoInicial(v, '10', '20.00'),
    );

    expect(cierre.estado, JSON.stringify(cierre.cuerpo)).toBe(200);
    expect(cierre.cuerpo).toMatchObject({ valorTotal: '0.00', articulosConExistencia: 0 });
    expect(saldo.cuerpo.error.codigo).toBe('saldos_con_cierres');
  });
});
