/**
 * Cambio de la fecha de inicio (U8-6): Empresas avisa por el mediador y Cuentas por pagar rechaza el cambio si algún
 * saldo inicial quedaría emitido en la fecha nueva o después; nada cambia. Sin el módulo activo no se consulta.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { SaldosInicialesPorFechaDrizzle } from '../modulos/cuentas-por-pagar/infraestructura/persistencia/saldos-iniciales-por-fecha.drizzle.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta } from './soporte/escenarios.js';
import { HOY, prepararEscenario, type EscenarioDeDocumentos } from './soporte/escenario-de-documentos.js';

const entorno = usarEntornoApi();
let escenario: EscenarioDeDocumentos;
let documentos: DocumentosPorPagarDePrueba;

const propietario = () => escenario.cuenta.propietario;
const rutaCarga = () => `/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`;
const fijar = (fechaDeInicio: string) => propietario().put(rutaCarga(), { fechaDeInicio });
const fechaActual = async () => (await propietario().get(rutaCarga())).cuerpo.fechaDeInicio;

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxpfechaini', MODULOS_DE_CUENTAS_POR_PAGAR);
  documentos = new DocumentosPorPagarDePrueba(escenario, HOY);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('cambiar la fecha de inicio con Cuentas por pagar activo', () => {
  it('pasa si todavía no hay saldos iniciales', async () => {
    expect((await fijar('2026-10-01')).estado).toBe(200);
    expect((await fijar('2026-11-01')).estado).toBe(200);
    expect(await fechaActual()).toBe('2026-11-01');
  });

  it('rechaza con 422 y deja la fecha como estaba si un saldo inicial quedaría emitido en la fecha nueva o después', async () => {
    await fijar('2026-12-01');
    await documentos.sembrarSaldoInicial({ fechaEmision: '2026-10-20' });
    await documentos.sembrarSaldoInicial({ fechaEmision: '2026-11-15' });

    const mismoDia = await fijar('2026-10-20');
    const posterior = await fijar('2026-10-01');

    for (const respuesta of [mismoDia, posterior]) {
      expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(422);
      expect(respuesta.cuerpo.error.codigo).toBe('saldos_iniciales_posteriores_a_la_fecha');
    }
    expect(mismoDia.cuerpo.error.mensaje).toContain('Hay 2 saldos iniciales');
    expect(posterior.cuerpo.error.mensaje).toContain('Hay 2 saldos iniciales');
    expect(await fechaActual()).toBe('2026-12-01');
  });

  it('pasa hacia delante cuando todos los saldos son anteriores a la fecha nueva, y con la misma fecha no pregunta', async () => {
    const contar = vi.spyOn(SaldosInicialesPorFechaDrizzle.prototype, 'contarEmitidosDesde');

    expect((await fijar('2026-12-01')).estado).toBe(200);
    expect(contar).not.toHaveBeenCalled();
    expect((await fijar('2026-12-31')).estado).toBe(200);
    expect(contar).toHaveBeenCalledTimes(1);
    expect(await fechaActual()).toBe('2026-12-31');
  });
});

describe('cambiar la fecha de inicio con Cuentas por pagar inactivo', () => {
  it('no se le pregunta nada y el cambio pasa', async () => {
    const sinModulo = await darDeAltaCuenta(entorno, { nombre: 'sincxpfecha', usuario: 'sincxpfecha', modulos: [] });
    const contar = vi.spyOn(SaldosInicialesPorFechaDrizzle.prototype, 'contarEmitidosDesde');
    const ruta = `/api/empresas/${sinModulo.empresaId}/carga-inicial`;

    const primera = await sinModulo.propietario.put(ruta, { fechaDeInicio: '2026-01-01' });
    const cambio = await sinModulo.propietario.put(ruta, { fechaDeInicio: '2026-02-01' });

    expect([primera.estado, cambio.estado]).toEqual([200, 200]);
    expect(contar).not.toHaveBeenCalled();
  });
});
