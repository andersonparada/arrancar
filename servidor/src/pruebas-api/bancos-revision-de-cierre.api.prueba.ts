/**
 * EM-2.6: Bancos responde la revisión que Empresas pide antes de cerrar la carga inicial: los hallazgos de BS-2 llevados
 * al contrato (con su nivel), las cifras del cuadre y el aviso de cuentas activas sin ningún saldo inicial.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { empresaConInicio, guardarSaldo } from './soporte/apertura-por-api.js';
import { comoPropietario } from './soporte/consultas-de-propietario.js';
import { usarEntornoApi } from './soporte/entorno-api.js';
import { crearCuentaSinSaldo } from './soporte/escenarios-de-apertura.js';
import { darDeAltaCuenta, type CuentaDePrueba } from './soporte/escenarios.js';

const entorno = usarEntornoApi();
let cuenta: CuentaDePrueba;

interface RevisionDeModulo {
  nombreDelModulo: string;
  resumen: string | null;
  ruta: string | null;
  hallazgos: Array<{ codigo: string; nivel: string; mensaje: string; registro: { id: string; nombre: string } | null }>;
  cifras: Array<{ clave: string; tipo: string; valor: string; registro: { id: string; nombre: string } | null }>;
}

const revisionDe = async (usuario: CuentaDePrueba) => {
  const { estado, cuerpo } = await usuario.propietario.get(
    `/api/empresas/${usuario.empresaId}/carga-inicial/revision-de-cierre`,
  );
  expect(estado, JSON.stringify(cuerpo)).toBe(200);
  return cuerpo as { pideMotivo: boolean; diferencias: number; modulos: RevisionDeModulo[] };
};
const deBancos = async (usuario: CuentaDePrueba) =>
  (await revisionDe(usuario)).modulos.find((modulo) => modulo.nombreDelModulo === 'Bancos');

beforeAll(async () => {
  cuenta = await empresaConInicio(entorno, { nombre: 'Revision bancos', usuario: 'propietariorevisionbancos' });
});

describe('revisión de Bancos al cerrar la carga inicial', () => {
  it('sin cuentas bancarias no tiene nada que decir', async () => {
    expect(await deBancos(cuenta)).toBeUndefined();
  });

  it('con cuentas activas y ninguna con saldo inicial avisa, sin pedir motivo, y las cifras van en cero', async () => {
    await crearCuentaSinSaldo(cuenta.propietario);
    await crearCuentaSinSaldo(cuenta.propietario);

    const revision = await revisionDe(cuenta);
    const bancos = revision.modulos.find((modulo) => modulo.nombreDelModulo === 'Bancos')!;

    expect(bancos).toMatchObject({ resumen: null, ruta: '/bancos/cuentas-bancarias' });
    expect(bancos.hallazgos).toEqual([
      {
        codigo: 'sin_saldos_iniciales',
        nivel: 'aviso',
        mensaje: 'Hay 2 cuentas bancarias activas y ninguna tiene saldo inicial.',
        registro: null,
      },
    ]);
    expect(bancos.cifras.map((c) => [c.clave, c.valor])).toEqual([
      ['cuentas_con_saldo_inicial', '0'],
      ['total_bancos', '0.00'],
      ['total_sobregiros', '0.00'],
    ]);
    expect(revision.pideMotivo).toBe(false);
  });

  it('cada hallazgo con su nivel, y las cifras totales y por cuenta sin compensar', async () => {
    const aparte = await empresaConInicio(entorno, { nombre: 'Revision completa', usuario: 'propietariorevcompleta' });
    const yo = aparte.propietario;
    const [cuadrada, descuadrada, sinDato, sobregirada, sinSaldo] = [
      await crearCuentaSinSaldo(yo),
      await crearCuentaSinSaldo(yo),
      await crearCuentaSinSaldo(yo),
      await crearCuentaSinSaldo(yo),
      await crearCuentaSinSaldo(yo),
    ] as [string, string, string, string, string];
    await guardarSaldo(yo, cuadrada, { saldoSegunEstadoDeCuenta: '100.00', saldoSegunLibrosAnteriores: '100.00' });
    await guardarSaldo(yo, descuadrada, { saldoSegunEstadoDeCuenta: '100.00', saldoSegunLibrosAnteriores: '90.00' });
    await guardarSaldo(yo, sinDato, '200.00');
    await guardarSaldo(yo, sobregirada, { saldoSegunEstadoDeCuenta: '-50.00', saldoSegunLibrosAnteriores: '-50.00' });

    const revision = await revisionDe(aparte);
    const bancos = revision.modulos.find((modulo) => modulo.nombreDelModulo === 'Bancos')!;
    const nivelesDe = (id: string) =>
      bancos.hallazgos.filter((h) => h.registro?.id === id).map((h) => [h.codigo, h.nivel]);
    const cifrasDe = (id: string | null) =>
      bancos.cifras.filter((c) => (c.registro?.id ?? null) === id).map((c) => [c.clave, c.valor]);

    expect(nivelesDe(cuadrada)).toEqual([['sin_evidencia', 'aviso']]);
    expect(nivelesDe(descuadrada)).toEqual([
      ['no_cuadra', 'pide_motivo'],
      ['sin_evidencia', 'aviso'],
    ]);
    expect(nivelesDe(sinDato)).toEqual([
      ['sin_dato_de_libros', 'pide_motivo'],
      ['sin_evidencia', 'aviso'],
    ]);
    expect(nivelesDe(sobregirada)).toEqual([
      ['sin_evidencia', 'aviso'],
      ['sobregiro_sin_permiso', 'aviso'],
    ]);
    expect(nivelesDe(sinSaldo)).toEqual([]);
    expect(bancos.hallazgos.find((h) => h.codigo === 'no_cuadra')!.mensaje).toContain(
      'difiere de los libros anteriores',
    );
    expect(bancos.resumen).toBe('4 cuentas con saldo inicial al 31/12/2025');
    expect(cifrasDe(null)).toEqual([
      ['cuentas_con_saldo_inicial', '4'],
      ['total_bancos', '400.00'],
      ['total_sobregiros', '50.00'],
    ]);
    expect(cifrasDe(descuadrada)).toEqual([
      ['saldo_en_libros_al_corte', '100.00'],
      ['saldo_segun_libros_anteriores', '90.00'],
      ['diferencia', '10.00'],
    ]);
    expect(cifrasDe(sinDato)).toEqual([['saldo_en_libros_al_corte', '200.00']]);
    expect(cifrasDe(sinSaldo)).toEqual([]);
    expect(revision).toMatchObject({ pideMotivo: true, diferencias: 2 });
  });

  it('al cerrar con diferencias pide el motivo y lo guardado lleva las cifras de Bancos', async () => {
    const aparte = await empresaConInicio(entorno, { nombre: 'Cierre bancos', usuario: 'propietariocierrebancos' });
    const cuentaId = await crearCuentaSinSaldo(aparte.propietario);
    await guardarSaldo(aparte.propietario, cuentaId, { saldoSegunEstadoDeCuenta: '75.00' });
    const ruta = `/api/empresas/${aparte.empresaId}/carga-inicial/cerrar`;

    const sinMotivo = await aparte.propietario.post(ruta, {});
    const cerrada = await aparte.propietario.post(ruta, { motivo: 'Sin el dato de los libros anteriores' });
    const [entrada] = await comoPropietario<{ anterior: { revision: { modulos: RevisionDeModulo[] } } }>(
      `select anterior from core.auditoria where accion = 'cerrar' and empresa_id = $1`,
      [aparte.empresaId],
    );

    expect(sinMotivo.cuerpo.error.codigo).toBe('motivo_de_cierre_requerido');
    expect(cerrada.cuerpo.cerrada).toBe(true);
    const guardado = entrada!.anterior.revision.modulos.find((m) => m.nombreDelModulo === 'Bancos')!;
    expect(guardado.cifras).toContainEqual(expect.objectContaining({ clave: 'total_bancos', valor: '75.00' }));
  });

  it('con Bancos apagado no responde', async () => {
    const sinBancos = await darDeAltaCuenta(entorno, {
      nombre: 'Sin bancos',
      usuario: 'sinbancosrevision',
      modulos: [],
    });
    await sinBancos.propietario.put(`/api/empresas/${sinBancos.empresaId}/carga-inicial`, {
      fechaDeInicio: '2026-01-01',
    });

    expect(await deBancos(sinBancos)).toBeUndefined();
  });
});
