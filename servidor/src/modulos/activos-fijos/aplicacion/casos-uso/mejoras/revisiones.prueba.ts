import { beforeEach, describe, expect, it } from 'vitest';
import {
  ActivoSinDepreciacionParaMejorar,
  PorcentajeFiscalAdoptado,
  RevisionInvalida,
} from '../../../dominio/errores-de-mejora.js';
import { ValorFiscalSoloEnEdificios } from '../../../dominio/errores-de-activo.js';
import { armarMejoras, operador, type EscenarioDeMejoras } from '../../../pruebas/escenario-de-mejoras.soporte.js';

let e: EscenarioDeMejoras;

beforeEach(() => {
  e = armarMejoras();
});

const revision = (cambios: Record<string, unknown> = {}) => ({
  vidaUtilRestanteMeses: 90,
  valorResidual: null,
  motivo: 'El tractor aguanta más de lo estimado',
  ...cambios,
});

/** Marzo, abril y mayo de 2027 cerrados: el primer mes abierto es junio. */
async function conTresMesesCerrados(activoId: string) {
  const tramos = await e.vigentes(activoId);
  e.cierres.ultimoMes = '2027-05-01';
  e.historial.porActivo.set(activoId, {
    depreciadoPorTramo: new Map(tramos.map((t) => [t.id, t.libro === 'contable' ? 1_125_000 : 1_250_001])),
    acumuladaCentavos: { contable: 1_125_000, fiscal: 1_250_001 },
  });
}

describe('RevisarEstimacion', () => {
  it('abre un tramo contable desde el primer mes abierto, ajusta el activo y deja la auditoría', async () => {
    const activo = await e.activoEnUso();
    await conTresMesesCerrados(activo.id.valor);
    const id = activo.id.valor;

    await e.revisarEstimacion.ejecutar(operador, { activoId: id, solicitud: revision({ valorResidual: '50000.00' }) });

    const nuevo = (await e.vigentes(id)).find((t) => t.causa === 'revision_de_estimacion');
    expect(nuevo).toMatchObject({
      libro: 'contable',
      desdePeriodo: '2027-06-01',
      meses: 90,
      valorResidualCentavos: 5_000_000,
    });
    expect(nuevo!.porDepreciarCentavos).toBe(25_000_000 - 1_125_000 - 5_000_000);
    expect((await e.vigentes(id)).filter((t) => t.libro === 'fiscal')).toHaveLength(1);
    expect(activo.instantanea()).toMatchObject({ vidaUtilContableMeses: 93, valorResidual: '50000.00' });
    expect(e.auditoria.entradas).toMatchObject([
      { recurso: 'activos-fijos.activos', accion: 'corregir', motivo: 'El tractor aguanta más de lo estimado' },
    ]);
    expect(e.auditoria.entradas[0]!.anterior).toMatchObject({ tramos: [] });
  });

  it('sin motivo, con una vida fuera de rango o con un residual sobre el costo se rechaza', async () => {
    const activo = await e.activoEnUso();
    const id = activo.id.valor;
    const revisar = (cambios: Record<string, unknown>) =>
      e.revisarEstimacion.ejecutar(operador, { activoId: id, solicitud: revision(cambios) });

    await expect(revisar({ motivo: '  ' })).rejects.toBeInstanceOf(RevisionInvalida);
    await expect(revisar({ vidaUtilRestanteMeses: 0 })).rejects.toBeInstanceOf(RevisionInvalida);
    await expect(revisar({ valorResidual: '250000.01' })).rejects.toBeInstanceOf(RevisionInvalida);
    expect(e.auditoria.entradas).toHaveLength(0);
  });

  it('el porcentaje fiscal no se cambia: con un cierre que lo usó cita los arts. 27 y 28', async () => {
    const activo = await e.activoEnUso();
    const id = activo.id.valor;
    const revisar = (porcentajeFiscal: string) =>
      e.revisarEstimacion.ejecutar(operador, { activoId: id, solicitud: revision({ porcentajeFiscal }) });

    await expect(revisar('20.00')).resolves.toBeDefined();
    await expect(revisar('15.00')).rejects.toBeInstanceOf(RevisionInvalida);
    e.cierres.activosUsados.add(id);
    await expect(revisar('15.00')).rejects.toBeInstanceOf(PorcentajeFiscalAdoptado);
  });

  it('un activo en construcción no se revisa', async () => {
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '1000.00');

    const revisar = e.revisarEstimacion.ejecutar(operador, { activoId: activo.id.valor, solicitud: revision() });

    await expect(revisar).rejects.toBeInstanceOf(ActivoSinDepreciacionParaMejorar);
  });
});

describe('CambiarValorFiscalDelInmueble', () => {
  const cambio = (cambios: Record<string, unknown> = {}) => ({
    valorDeMatricula: '600000.00',
    valorCatastral: null,
    valoresDelInmuebleCompleto: false,
    motivo: 'Nuevo avalúo',
    documentoDeSoporte: 'Avalúo 12-2027',
    ...cambios,
  });

  it('abre un tramo fiscal cambio_de_matricula con la base topada, sin tocar el contable, y avisa', async () => {
    const activo = await e.activoEnUso({ inciso: 'edificios', monto: '1000000.00', porcentaje: '5.00' });
    const id = activo.id.valor;
    await conTresMesesCerrados(id);
    e.historial.porActivo.get(id)!.acumuladaCentavos.fiscal = 0;
    e.publicador.publicados.length = 0;

    await e.cambiarValorFiscal.ejecutar(operador, { activoId: id, solicitud: cambio() });

    const nuevos = (await e.vigentes(id)).filter((t) => t.causa === 'cambio_de_matricula');
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0]).toMatchObject({
      libro: 'fiscal',
      desdePeriodo: '2027-06-01',
      porcentaje: '5.00',
      baseDelPorcentajeCentavos: 60_000_000,
      cuotaMensualCentavos: 250_000,
    });
    expect(activo.instantanea().valorDeMatricula).toBe('600000.00');
    expect(e.auditoria.entradas).toMatchObject([
      { accion: 'corregir', motivo: 'Nuevo avalúo (soporte: Avalúo 12-2027)' },
    ]);
    expect(e.publicador.publicados[0]).toMatchObject({
      nombre: 'activos-fijos.base_fiscal_cambiada',
      datos: { valorDeMatriculaAnterior: null, valorDeMatricula: '600000.00', baseFiscalCentavos: 60_000_000 },
    });
  });

  it('solo los edificios llevan matrícula, y el motivo y el soporte son obligatorios', async () => {
    const vehiculo = await e.activoEnUso();
    const edificio = await e.activoEnUso({ inciso: 'edificios', monto: '1000000.00', porcentaje: '5.00' });
    const cambiar = (activoId: string, cambios: Record<string, unknown> = {}) =>
      e.cambiarValorFiscal.ejecutar(operador, { activoId, solicitud: cambio(cambios) });

    await expect(cambiar(vehiculo.id.valor)).rejects.toBeInstanceOf(ValorFiscalSoloEnEdificios);
    await expect(cambiar(edificio.id.valor, { motivo: '' })).rejects.toBeInstanceOf(RevisionInvalida);
    await expect(cambiar(edificio.id.valor, { documentoDeSoporte: ' ' })).rejects.toBeInstanceOf(RevisionInvalida);
    expect(e.publicador.publicados).toHaveLength(0);
  });
});
