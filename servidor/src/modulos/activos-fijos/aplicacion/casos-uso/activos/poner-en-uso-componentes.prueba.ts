import { beforeEach, describe, expect, it } from 'vitest';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import { ComponenteSeTrasladaConSuPrincipal } from '../../../dominio/errores-de-traslado.js';
import {
  armarTraslados,
  LOCALIDAD_NORTE,
  LOCALIDAD_SUR,
  operador,
  solicitudDeTraslado,
} from '../../../pruebas/escenario-de-traslados.soporte.js';
import { uso } from '../../../pruebas/escenario-de-uso.soporte.js';

let e: ReturnType<typeof armarTraslados>;

beforeEach(() => {
  e = armarTraslados();
});

const ubicacion = { localidadId: LOCALIDAD_NORTE, departamentoId: null, responsable: null };

describe('PonerEnUsoVarios: componentes y fecha', () => {
  it('un componente que ya estaba en uso recibe traslado con boleta, no cambia su fila de alta', async () => {
    const principal = await e.activo();
    const motor = await e.activo({ datos: { activoPadreId: principal.id.valor } });
    await e.poner(motor, uso());
    e.cierres.ultimoMes = '2027-04-30';

    await e.ponerEnUsoVarios.ejecutar(operador, {
      activoIds: [principal.id.valor],
      fechaDeInicioDeUso: '2027-05-10',
      ubicacion,
    });

    const delMotor = e.traslados.filas.filter((fila) => fila.traslado?.instantanea().activoId === motor.id.valor);
    expect(delMotor).toHaveLength(1);
    expect(motor.instantanea().localidadId).toBe(LOCALIDAD_NORTE);
  });

  it('no se pone en uso un componente con ubicación si su principal no va en el lote', async () => {
    const principal = await e.activo();
    const motor = await e.activo({ datos: { activoPadreId: principal.id.valor } });

    await expect(
      e.ponerEnUsoVarios.ejecutar(operador, {
        activoIds: [motor.id.valor],
        fechaDeInicioDeUso: '2027-03-10',
        ubicacion,
      }),
    ).rejects.toBeInstanceOf(ComponenteSeTrasladaConSuPrincipal);
  });

  it('la fecha de uso debe caer en un mes abierto aunque el primer mes de depreciación sea el siguiente', async () => {
    const tractor = await e.activo();
    e.primerMes.regla = 'mes_siguiente';
    e.cierres.ultimoMes = '2027-03-31';

    await expect(
      e.ponerEnUsoVarios.ejecutar(operador, { activoIds: [tractor.id.valor], fechaDeInicioDeUso: '2027-03-10' }),
    ).rejects.toBeInstanceOf(MesCerrado);
  });

  it('principal solo con alta y componente en uso: ambos van en la boleta y al anularla vuelven juntos', async () => {
    const principal = await e.activo();
    const motor = await e.activo({ datos: { activoPadreId: principal.id.valor } });
    await e.poner(motor, uso());
    e.cierres.ultimoMes = '2027-04-30';

    await e.ponerEnUsoVarios.ejecutar(operador, {
      activoIds: [principal.id.valor],
      fechaDeInicioDeUso: '2027-05-10',
      ubicacion,
    });
    const boleta = e.traslados.filas.filter((f) => f.traslado).map((f) => f.traslado!.instantanea().grupoId);
    expect(new Set(boleta).size).toBe(1);
    expect(boleta).toHaveLength(2);

    await e.anular(boleta[0]!);

    expect(principal.instantanea().localidadId).toBeNull();
    expect(motor.instantanea().localidadId).toBeNull();
  });

  it('principal con traslado previo y componente en construcción: ambos en la boleta, sin reescribir altas', async () => {
    const principal = await e.activo();
    await e.trasladar(solicitudDeTraslado([principal], { fecha: '2027-03-01' }));
    const motor = await e.activo({ datos: { activoPadreId: principal.id.valor } });
    e.cierres.ultimoMes = '2027-02-28';

    await e.ponerEnUsoVarios.ejecutar(operador, {
      activoIds: [principal.id.valor],
      fechaDeInicioDeUso: '2027-05-10',
      ubicacion: { ...ubicacion, localidadId: LOCALIDAD_SUR },
    });
    const ultimas = e.traslados.filas.filter((f) => f.traslado?.instantanea().motivo === 'Disponible para uso');
    expect(ultimas).toHaveLength(2);

    await e.anular(ultimas[0]!.traslado!.instantanea().grupoId);

    expect(principal.instantanea().localidadId).toBe(LOCALIDAD_NORTE);
    expect(motor.instantanea().localidadId).toBeNull();
  });
});
