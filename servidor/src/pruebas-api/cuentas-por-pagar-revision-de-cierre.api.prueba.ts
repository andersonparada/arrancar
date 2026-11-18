/**
 * La revisión de Cuentas por pagar al cerrar la carga inicial (EM-2.7): avisos y cifras que Empresas junta con la
 * «pregunta a todos». Solo avisos: nunca pide motivo.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { RUTA_DOCUMENTOS, prepararEscenario, registrarProveedor } from './soporte/escenario-de-documentos.js';
import type { EscenarioDeDocumentos } from './soporte/escenario-de-documentos.js';
import { DocumentosPorPagarDePrueba, MODULOS_DE_CUENTAS_POR_PAGAR } from './soporte/cuentas-por-pagar.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { darDeAltaCuenta } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
const RUTA = '/api/cuentas-por-pagar/saldos-iniciales';
let escenario: EscenarioDeDocumentos;
let otroProveedorId: string;
let documentos: DocumentosPorPagarDePrueba;

const propietario = () => escenario.cuenta.propietario;
const revisionDeCierre = async () => {
  const { estado, cuerpo } = await propietario().get(
    `/api/empresas/${escenario.cuenta.empresaId}/carga-inicial/revision-de-cierre`,
  );
  expect(estado, JSON.stringify(cuerpo)).toBe(200);
  return cuerpo as {
    pideMotivo: boolean;
    modulos: Array<{
      nombreDelModulo: string;
      resumen: string | null;
      ruta: string | null;
      hallazgos: Array<{ codigo: string; nivel: string; mensaje: string }>;
      cifras: Array<{ clave: string; valor: string; tipo: string }>;
    }>;
  };
};
const deCuentasPorPagar = async () => {
  const revision = await revisionDeCierre();
  return { revision, modulo: revision.modulos.find((m) => m.nombreDelModulo === 'Cuentas por pagar')! };
};
const cifra = (modulo: { cifras: Array<{ clave: string; valor: string }> }, clave: string) =>
  modulo.cifras.find((c) => c.clave === clave)?.valor;

const saldo = (cambios: Record<string, unknown>) => ({
  proveedorId: escenario.proveedorId,
  tipo: 'factura',
  serie: 'a',
  numero: '1',
  fechaEmision: '2025-12-20',
  vencimiento: '2026-01-20',
  total: '1120.00',
  retenciones: '120.00',
  retencionesPorPracticar: '0.00',
  saldoPendiente: '700.00',
  referencia: null,
  ...cambios,
});
const cargar = async (cambios: Record<string, unknown>) => {
  const respuesta = await propietario().post(RUTA, saldo(cambios));
  expect(respuesta.estado, JSON.stringify(respuesta.cuerpo)).toBe(201);
};

beforeAll(async () => {
  escenario = await prepararEscenario(entorno, 'cxprevision', MODULOS_DE_CUENTAS_POR_PAGAR);
  otroProveedorId = (await registrarProveedor(escenario.cuenta, 'Distribuidora Norte')).proveedorId;
  documentos = new DocumentosPorPagarDePrueba(escenario, '2025-11-20');
  await propietario().put(`/api/empresas/${escenario.cuenta.empresaId}/carga-inicial`, { fechaDeInicio: '2026-01-01' });
});

describe('revisión de Cuentas por pagar', () => {
  it('sin ningún saldo inicial avisa y trae las cifras en cero, sin pedir motivo', async () => {
    const { revision, modulo } = await deCuentasPorPagar();

    expect(modulo).toMatchObject({ ruta: '/cuentas-por-pagar/saldos-iniciales', resumen: null });
    expect(modulo.hallazgos).toEqual([
      expect.objectContaining({
        codigo: 'sin_saldos_iniciales',
        nivel: 'aviso',
        mensaje: expect.stringContaining('al 31/12/2025'),
      }),
    ]);
    expect(cifra(modulo, 'saldo_de_proveedores')).toBe('0.00');
    expect(revision.pideMotivo).toBe(false);
  });

  it('con saldos y retenciones por practicar avisa con el texto del dictamen, y trae resumen y cifras', async () => {
    await cargar({ numero: '1', saldoPendiente: '700.00', retencionesPorPracticar: '20.00' });
    await cargar({ numero: '2', saldoPendiente: '300.50', retencionesPorPracticar: '5.00' });

    const { modulo } = await deCuentasPorPagar();

    expect(modulo.resumen).toBe('2 documentos de 1 proveedor');
    expect(modulo.hallazgos.map((h) => h.codigo)).toEqual(['retenciones_por_practicar']);
    expect(modulo.hallazgos[0]!.mensaje).toBe(
      '2 documentos con retenciones por practicar por Q25.00. Verifique que no se hayan acreditado en cuenta antes del ' +
        '01/01/2026: si así fue, la retención ya debía practicarse y enterarse.',
    );
    expect(cifra(modulo, 'documentos')).toBe('2');
    expect(cifra(modulo, 'cargos')).toBe('1000.50');
    expect(cifra(modulo, 'retenciones_por_practicar')).toBe('25.00');
  });

  it('dos proveedores, uno con saldo y otro a favor: las dos cifras no se compensan', async () => {
    await cargar({
      numero: '3',
      proveedorId: otroProveedorId,
      tipo: 'nota_de_credito',
      vencimiento: null,
      total: '80.00',
      retenciones: '0.00',
      saldoPendiente: '80.00',
    });

    const { modulo } = await deCuentasPorPagar();

    expect(cifra(modulo, 'saldo_de_proveedores')).toBe('1000.50');
    expect(cifra(modulo, 'saldo_a_favor_de_la_empresa')).toBe('80.00');
    expect(cifra(modulo, 'notas_a_favor')).toBe('80.00');
    expect(cifra(modulo, 'proveedores')).toBe('2');
    expect(modulo.hallazgos.map((h) => h.codigo)).toContain('proveedores_con_saldo_a_favor');
    expect(modulo.hallazgos.find((h) => h.codigo === 'proveedores_con_saldo_a_favor')!.mensaje).toContain(
      '1 proveedor tiene saldo a favor de la empresa por Q80.00',
    );
  });

  it('un documento del Libro de compras anterior a la fecha de inicio avisa; ni los anulados ni los saldos iniciales cuentan', async () => {
    const vigente = await documentos.registrar({ serie: 'LIB' });
    const anulado = await documentos.registrar({ serie: 'LIB' });
    const baja = await propietario().post(`${RUTA_DOCUMENTOS}/${anulado}/anular`, {
      causa: 'error_de_captura',
      motivo: 'Se registró por error',
    });
    expect(baja.estado, JSON.stringify(baja.cuerpo)).toBe(200);

    const { modulo } = await deCuentasPorPagar();
    const aviso = modulo.hallazgos.find((h) => h.codigo === 'documentos_del_libro_anteriores');

    expect(vigente).not.toBe(anulado);
    expect(aviso?.mensaje).toContain(
      '1 documento del Libro de compras, por Q1,120.00, tiene fecha de emisión anterior al 01/01/2026',
    );
  });

  it('sin hallazgos trae solo el resumen y las cifras', async () => {
    const limpio = await prepararEscenario(entorno, 'cxprevisionlimpia', MODULOS_DE_CUENTAS_POR_PAGAR);
    await limpio.cuenta.propietario.put(`/api/empresas/${limpio.cuenta.empresaId}/carga-inicial`, {
      fechaDeInicio: '2026-01-01',
    });
    await limpio.cuenta.propietario.post(RUTA, { ...saldo({}), proveedorId: limpio.proveedorId });

    const { cuerpo } = await limpio.cuenta.propietario.get(
      `/api/empresas/${limpio.cuenta.empresaId}/carga-inicial/revision-de-cierre`,
    );
    const modulo = cuerpo.modulos.find((m: { nombreDelModulo: string }) => m.nombreDelModulo === 'Cuentas por pagar');

    expect(modulo).toMatchObject({ resumen: '1 documento de 1 proveedor', hallazgos: [] });
  });

  it('con el módulo apagado no responde', async () => {
    const sinModulo = await darDeAltaCuenta(entorno, { nombre: 'Sin cxp rev', usuario: 'sincxprevision', modulos: [] });
    await sinModulo.propietario.put(`/api/empresas/${sinModulo.empresaId}/carga-inicial`, {
      fechaDeInicio: '2026-01-01',
    });

    const { cuerpo } = await sinModulo.propietario.get(
      `/api/empresas/${sinModulo.empresaId}/carga-inicial/revision-de-cierre`,
    );

    expect(cuerpo.modulos.map((m: { nombreDelModulo: string }) => m.nombreDelModulo)).toEqual(['Empresa']);
  });
});
