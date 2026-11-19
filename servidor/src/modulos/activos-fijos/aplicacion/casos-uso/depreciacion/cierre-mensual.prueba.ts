import { beforeEach, describe, expect, it } from 'vitest';
import {
  CierreConBloqueos,
  MesAnteriorAlInicio,
  MesAnteriorSinCerrar,
  MesPorLlegar,
  MotivoDeReaperturaInvalido,
  RevisionDelCierreDesactualizada,
  SinMesPorCerrar,
  SoloSeReabreElUltimo,
} from '../../../dominio/errores-de-cierre.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import { armarCierre, operador, pickUp, type EscenarioDeCierre } from '../../../pruebas/escenario-de-cierre.soporte.js';

let e: EscenarioDeCierre;

beforeEach(() => {
  e = armarCierre();
  e.memoria.activos = [pickUp('1')];
});

describe('orden de los cierres', () => {
  it('el primer mes es el de la fecha de inicio de la empresa', async () => {
    e.carga.estado = { fechaDeInicio: '2027-01-15', cerrada: true };

    expect((await e.listar.ejecutar(operador)).siguienteMes).toBe('2027-01-01');
    await expect(e.cerrarMes('2027-02-01')).rejects.toBeInstanceOf(MesAnteriorSinCerrar);
    await expect(e.cerrarMes('2026-12-01')).rejects.toBeInstanceOf(MesAnteriorAlInicio);
    await e.cerrarMes('2027-01-01');
    expect((await e.listar.ejecutar(operador)).siguienteMes).toBe('2027-02-01');
  });

  it('sin fecha de inicio, el primer mes es el del primer uso; sin nada, no hay mes por cerrar', async () => {
    expect((await e.listar.ejecutar(operador)).siguienteMes).toBe('2027-03-01');

    e.memoria.activos = [];
    expect((await e.listar.ejecutar(operador)).siguienteMes).toBeNull();
    await expect(e.cerrarMes('2027-03-01')).rejects.toBeInstanceOf(SinMesPorCerrar);
  });

  it('un mes que no es el siguiente no se calcula: la revisión solo dice cuál cerrar primero', async () => {
    const revision = await e.revisarMes('2027-05-01');

    expect(revision.puedeCerrar).toBe(false);
    expect(revision.hallazgos.map((h) => h.codigo)).toEqual(['mes_anterior_sin_cerrar']);
    expect(revision.totales).toEqual({ contable: '0.00', fiscal: '0.00', activosDepreciados: 0 });
    await expect(e.cerrarMes('2027-05-01')).rejects.toMatchObject({ detalles: { siguiente: '2027-03-01' } });
    expect(e.memoria.cuotas).toHaveLength(0);
  });

  it('no se cierra un mes posterior al mes en curso: la revisión lo bloquea y cerrar se rechaza', async () => {
    e.reloj.fecha = '2027-04-15';
    await e.cerrarMes('2027-03-01');

    const revision = await e.revisarMes('2027-05-01');
    expect(revision.puedeCerrar).toBe(false);
    expect(revision.hallazgos.map((h) => h.codigo)).toEqual(['mes_por_llegar']);
    await expect(e.cerrarMes('2027-05-01')).rejects.toBeInstanceOf(MesPorLlegar);
    await e.cerrarMes('2027-04-01');
    expect(e.memoria.cuotas.filter((cuota) => cuota.libro === 'fiscal')).toHaveLength(2);
  });

  it('cierra un año completo en orden y las cuotas de cada mes siguen la acumulada del anterior', async () => {
    for (let mes = 3; mes <= 12; mes++) await e.cerrarMes(`2027-${String(mes).padStart(2, '0')}-01`);

    const fiscales = e.memoria.cuotas.filter((cuota) => cuota.libro === 'fiscal');
    expect(fiscales).toHaveLength(10);
    expect(fiscales.at(-1)?.acumuladaCentavos).toBe(4166670);
    expect(e.memoria.cuotas.filter((cuota) => cuota.libro === 'contable').at(-1)?.acumuladaCentavos).toBe(3750000);
    expect((await e.listar.ejecutar(operador)).cierres).toHaveLength(10);
  });
});

describe('revisar', () => {
  it('muestra los totales que saldrán sin guardar nada y da una huella estable', async () => {
    const primera = await e.revisarMes('2027-03-01');
    const segunda = await e.revisarMes('2027-03-01');

    expect(primera.totales).toEqual({ contable: '3750.00', fiscal: '4166.67', activosDepreciados: 1 });
    expect(primera.puedeCerrar).toBe(true);
    expect(primera.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(segunda.huella).toBe(primera.huella);
    expect(e.memoria.cuotas).toHaveLength(0);
    expect(e.auditoria.entradas).toHaveLength(0);
  });

  it('suma los avisos y los bloqueos de la base, de la bandeja y de la carga inicial', async () => {
    e.memoria.hallazgos = {
      ...e.memoria.hallazgos,
      enUsoSinLocalidad: { cantidad: 1, codigos: ['AF-1'] },
      conCostosDeDocumentosAnulados: { cantidad: 1, codigos: ['AF-1'] },
      conSaldoInicial: true,
    };
    e.carga.estado = { fechaDeInicio: '2027-03-01', cerrada: false };
    e.bandeja.lineas = [{ lineaId: 'l1' } as never];

    const revision = await e.revisarMes('2027-03-01');

    expect(revision.hallazgos.map((h) => `${h.nivel}:${h.codigo}`)).toEqual([
      'bloquea:costos_de_documentos_anulados',
      'bloquea:carga_inicial_abierta',
      'aviso:lineas_por_capitalizar',
      'aviso:activos_sin_localidad',
    ]);
    expect(revision.puedeCerrar).toBe(false);
  });

  it('el régimen de ISR del mes viaja en la revisión', async () => {
    e.memoria.regimen = 'utilidades';

    expect((await e.revisarMes('2027-03-01')).regimenIsr).toBe('utilidades');
  });

  it('un mes cerrado no se vuelve a revisar', async () => {
    await e.cerrarMes('2027-03-01');

    await expect(e.revisarMes('2027-03-01')).rejects.toBeInstanceOf(MesCerrado);
  });
});

describe('cerrar', () => {
  it('guarda el cierre y una cuota por activo y libro, audita y publica el evento al confirmar', async () => {
    e.memoria.regimen = 'opcional_simplificado';

    const cierre = await e.cerrarMes('2027-03-01');

    expect(cierre).toMatchObject({
      periodo: '2027-03-01',
      estado: 'cerrado',
      totalContable: '3750.00',
      totalFiscal: '4166.67',
      activosDepreciados: 1,
      regimenIsr: 'opcional_simplificado',
    });
    expect(e.memoria.cuotas.map((c) => `${c.libro}:${c.montoCentavos}`)).toEqual(['contable:375000', 'fiscal:416667']);
    expect(e.memoria.candados).toEqual(['exclusivo']);
    expect(e.auditoria.entradas).toMatchObject([
      { recurso: 'activos-fijos.cierres', accion: 'cerrar', anterior: { periodo: '2027-03-01', contable: '3750.00' } },
    ]);
    expect(e.publicador.nombres()).toEqual(['activos-fijos.depreciacion_cerrada']);
    expect(e.publicador.publicados[0]!.datos).toMatchObject({
      periodo: '2027-03-01',
      totalContableCentavos: 375000,
      totalFiscalCentavos: 416667,
      regimenIsr: 'opcional_simplificado',
      cuotas: [{ libro: 'contable', montoCentavos: 375000, claseId: 'vehiculos' }, { libro: 'fiscal' }],
    });
  });

  it('cerrar el mismo mes otra vez se rechaza y no duplica cuotas, auditoría ni eventos', async () => {
    await e.cerrarMes('2027-03-01');

    await expect(e.cerrarMes('2027-03-01')).rejects.toBeInstanceOf(MesCerrado);

    expect(e.memoria.cuotas).toHaveLength(2);
    expect(e.auditoria.entradas).toHaveLength(1);
    expect(e.publicador.publicados).toHaveLength(1);
  });

  it('con la huella de lo revisado cierra; si algo cambió en medio, pide revisar de nuevo', async () => {
    const { huella } = await e.revisarMes('2027-03-01');
    e.memoria.hallazgos = { ...e.memoria.hallazgos, enUsoSinLocalidad: { cantidad: 1, codigos: ['AF-1'] } };

    const error = await e.cerrarMes('2027-03-01', huella).catch((fallo: unknown) => fallo);

    expect(error).toBeInstanceOf(RevisionDelCierreDesactualizada);
    expect((error as RevisionDelCierreDesactualizada).detalles).toMatchObject({ huella: expect.any(String) });
    expect(e.memoria.cuotas).toHaveLength(0);
    const nueva = await e.revisarMes('2027-03-01');
    await e.cerrarMes('2027-03-01', nueva.huella);
    expect(e.memoria.cuotas).toHaveLength(2);
  });

  it('los bloqueos impiden cerrar y no dejan nada guardado', async () => {
    e.memoria.hallazgos = { ...e.memoria.hallazgos, conCostosDeDocumentosAnulados: { cantidad: 1, codigos: ['AF-1'] } };

    const error = await e.cerrarMes('2027-03-01').catch((fallo: unknown) => fallo);

    expect(error).toBeInstanceOf(CierreConBloqueos);
    expect(e.memoria.cuotas).toHaveLength(0);
    expect(e.auditoria.entradas).toHaveLength(0);
    expect(e.publicador.publicados).toHaveLength(0);
  });

  it('el activo ocioso se depreciа igual y se marca en la cuota (V-4)', async () => {
    e.memoria.activos = [{ ...pickUp('1'), ocioso: true }];

    await e.cerrarMes('2027-03-01');

    expect(e.memoria.cuotas.every((cuota) => cuota.ocioso)).toBe(true);
    expect(e.memoria.cuotas).toHaveLength(2);
  });
});

describe('reabrir', () => {
  it('solo reabre el último cerrado y con motivo', async () => {
    await e.cerrarMes('2027-03-01');
    await e.cerrarMes('2027-04-01');

    await expect(e.reabrirMes('2027-03-01')).rejects.toBeInstanceOf(SoloSeReabreElUltimo);
    await expect(e.reabrirMes('2027-04-01', '   ')).rejects.toBeInstanceOf(MotivoDeReaperturaInvalido);
    await expect(e.reabrirMes('2027-04-01', 'x'.repeat(501))).rejects.toBeInstanceOf(MotivoDeReaperturaInvalido);
    await expect(e.reabrirMes('2027-05-01')).rejects.toBeInstanceOf(SoloSeReabreElUltimo);
    expect(e.memoria.cuotas.filter((cuota) => cuota.vigente)).toHaveLength(4);
  });

  it('deja las cuotas del mes como no vigentes (sin borrarlas), audita con el cierre por clase y publica', async () => {
    await e.cerrarMes('2027-03-01');

    const cierre = await e.reabrirMes('2027-03-01', 'Falta un costo del flete');

    expect(cierre).toMatchObject({ estado: 'reabierto', motivoDeReapertura: 'Falta un costo del flete' });
    expect(e.memoria.cuotas).toHaveLength(2);
    expect(e.memoria.cuotas.every((cuota) => !cuota.vigente)).toBe(true);
    expect(e.auditoria.entradas.at(-1)).toMatchObject({
      recurso: 'activos-fijos.cierres',
      accion: 'reabrir',
      motivo: 'Falta un costo del flete',
      anterior: {
        periodo: '2027-03-01',
        totalContable: '3750.00',
        porClase: [{ claseId: 'vehiculos', contable: '3750.00', fiscal: '4166.67' }],
      },
    });
    expect(e.publicador.nombres()).toEqual([
      'activos-fijos.depreciacion_cerrada',
      'activos-fijos.depreciacion_reabierta',
    ]);
    expect((await e.listar.ejecutar(operador)).siguienteMes).toBe('2027-03-01');
  });

  it('reabrir varios meses es de uno en uno, del último hacia atrás, y se vuelve a cerrar sin duplicar', async () => {
    await e.cerrarMes('2027-03-01');
    await e.cerrarMes('2027-04-01');

    await e.reabrirMes('2027-04-01');
    await e.reabrirMes('2027-03-01');
    await e.cerrarMes('2027-03-01');
    await e.cerrarMes('2027-04-01');

    const vigentes = e.memoria.cuotas.filter((cuota) => cuota.vigente);
    expect(vigentes).toHaveLength(4);
    expect(e.memoria.cuotas).toHaveLength(8);
    expect(vigentes.filter((cuota) => cuota.libro === 'fiscal').map((cuota) => cuota.acumuladaCentavos)).toEqual([
      416667, 833334,
    ]);
  });

  it('sin cierres no hay nada que reabrir', async () => {
    await expect(e.reabrirMes('2027-03-01')).rejects.toBeInstanceOf(SoloSeReabreElUltimo);
  });
});
