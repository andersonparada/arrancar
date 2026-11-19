import { beforeEach, describe, expect, it } from 'vitest';
import { ActivoConLibrosUsados, ActivoSinLibros } from '../../../dominio/errores-de-depreciacion.js';
import { armarUso, operador, uso, type EscenarioDeUso } from '../../../pruebas/escenario-de-uso.soporte.js';

let e: EscenarioDeUso;

beforeEach(() => {
  e = armarUso();
});

describe('QuitarDeUso', () => {
  it('lo devuelve a construcción, borra sus tramos y deja la auditoría `devolver` con cómo estaba', async () => {
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '1000.00');
    await e.poner(activo);

    const ficha = await e.quitarDeUso.ejecutar(operador, activo.id.valor);

    expect(ficha).toMatchObject({
      estado: 'en_construccion',
      fechaDeInicioDeUso: null,
      porcentajeFiscal: null,
      vidaUtilContableMeses: null,
      valorResidual: null,
    });
    expect(e.tramosDe(activo)).toHaveLength(0);
    expect(e.auditoria.entradas).toHaveLength(1);
    expect(e.auditoria.entradas[0]).toMatchObject({
      recurso: 'activos-fijos.activos',
      registroId: activo.id.valor,
      accion: 'devolver',
      anterior: { estado: 'en_uso', porcentajeFiscal: '20.00' },
    });
  });

  it('se puede volver a poner en uso con otra fecha', async () => {
    const activo = await e.activoConCosto(await e.claseDe('maquinaria_y_vehiculos', '20.00'), '1000.00');
    await e.poner(activo);
    await e.quitarDeUso.ejecutar(operador, activo.id.valor);

    await e.poner(activo, uso({ fechaDeInicioDeUso: '2027-05-03' }));

    expect(e.tramosDe(activo).map((tramo) => tramo.desdePeriodo)).toEqual(['2027-05-01', '2027-05-01']);
  });

  it('no se deshace si un cierre ya usó sus tramos ni si el activo no está en uso', async () => {
    const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
    const usado = await e.activoConCosto(clase, '1000.00');
    const enConstruccion = await e.activoConCosto(clase, '1000.00');
    await e.poner(usado);
    e.cierres.activosUsados.add(usado.id.valor);

    await expect(e.quitarDeUso.ejecutar(operador, usado.id.valor)).rejects.toBeInstanceOf(ActivoConLibrosUsados);
    await expect(e.quitarDeUso.ejecutar(operador, enConstruccion.id.valor)).rejects.toBeInstanceOf(ActivoSinLibros);
    expect(e.tramosDe(usado)).toHaveLength(2);
    expect(usado.instantanea().estado).toBe('en_uso');
    expect(e.auditoria.entradas).toHaveLength(0);
  });
});
