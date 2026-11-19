import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { ActivoNoEnUso, DepartamentoDeOtraLocalidad } from '../../../dominio/errores-de-activo.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import {
  ComponenteSeTrasladaConSuPrincipal,
  FechaAnteriorAlUltimoTraslado,
  TrasladoInvalido,
  TrasladoParcialNoDisponible,
} from '../../../dominio/errores-de-traslado.js';
import {
  armarTraslados,
  DEPARTAMENTO_DEL_SUR,
  LOCALIDAD_NORTE,
  LOCALIDAD_SUR,
  solicitudDeTraslado,
  type EscenarioDeTraslados,
} from '../../../pruebas/escenario-de-traslados.soporte.js';

let e: EscenarioDeTraslados;

beforeEach(() => {
  e = armarTraslados();
});

describe('TrasladarActivos', () => {
  it('traslada un activo: deja la ubicación vigente, numera la boleta y la devuelve con su título', async () => {
    const tractor = await e.activo();

    const boleta = await e.trasladar(solicitudDeTraslado([tractor]));

    expect(boleta).toMatchObject({
      numero: 1,
      titulo: 'Responsiva de bienes',
      fecha: '2027-06-10',
      recibidoPor: 'Marta López',
      motivo: 'Entrega para su uso',
      estado: 'vigente',
      aBodega: false,
    });
    expect(boleta.renglones.map((r) => r.activoId)).toEqual([tractor.id.valor]);
    expect(tractor.instantanea()).toMatchObject({
      localidadId: LOCALIDAD_NORTE,
      responsable: 'Marta López',
      enBodega: false,
    });
    expect(e.publicador.nombres()).toEqual(['activos-fijos.activo_trasladado']);
  });

  it('varios activos comparten boleta y número; el siguiente traslado lleva el número que sigue', async () => {
    const uno = await e.activo();
    const dos = await e.activo();

    const primera = await e.trasladar(solicitudDeTraslado([uno, dos]));
    const segunda = await e.trasladar(solicitudDeTraslado([uno], { fecha: '2027-06-11' }));

    expect(primera.renglones).toHaveLength(2);
    expect([primera.numero, segunda.numero]).toEqual([1, 2]);
    expect(e.publicador.publicados).toHaveLength(3);
  });

  it('un componente se mueve con su activo principal y sale en la boleta', async () => {
    const principal = await e.activo();
    const motor = await e.activo({ datos: { activoPadreId: principal.id.valor } });

    const boleta = await e.trasladar(solicitudDeTraslado([principal]));

    const delMotor = boleta.renglones.find((r) => r.activoId === motor.id.valor);
    expect(boleta.renglones).toHaveLength(2);
    expect(delMotor?.componenteDe).toBe(principal.instantanea().codigo);
    expect(motor.instantanea().localidadId).toBe(LOCALIDAD_NORTE);
  });

  it('no traslada un componente solo', async () => {
    const principal = await e.activo();
    const motor = await e.activo({ datos: { activoPadreId: principal.id.valor } });

    await expect(e.trasladar(solicitudDeTraslado([motor]))).rejects.toBeInstanceOf(ComponenteSeTrasladaConSuPrincipal);
  });

  it('a la bodega: marca en_bodega y, con marcarOcioso, deja el bien ocioso desde la fecha del traslado', async () => {
    const tractor = await e.activo({ enUso: true });

    await e.trasladar(
      solicitudDeTraslado([tractor], { aBodega: true, marcarOcioso: true, responsable: null, motivo: 'Sin uso' }),
    );

    expect(tractor.instantanea()).toMatchObject({
      enBodega: true,
      ocioso: true,
      ociosoDesde: '2027-06-10',
      motivoDeOcio: 'Sin uso',
    });
    expect(e.auditoria.entradas).toMatchObject([
      { recurso: 'activos-fijos.activos', registroId: tractor.id.valor, accion: 'corregir' },
    ]);
  });

  it('marcar ocioso exige llevarlo a la bodega y un bien en uso', async () => {
    const enUso = await e.activo({ enUso: true });
    const enObra = await e.activo();

    await expect(e.trasladar(solicitudDeTraslado([enUso], { marcarOcioso: true }))).rejects.toBeInstanceOf(
      TrasladoInvalido,
    );
    await expect(
      e.trasladar(solicitudDeTraslado([enObra], { aBodega: true, marcarOcioso: true })),
    ).rejects.toBeInstanceOf(ActivoNoEnUso);
  });

  it('un activo que no existe no se traslada y no publica nada', async () => {
    const tractor = await e.activo();

    await expect(
      e.trasladar(solicitudDeTraslado([tractor], { renglones: [{ activoId: crypto.randomUUID() }] })),
    ).rejects.toBeInstanceOf(RecursoNoEncontrado);
    expect(e.publicador.publicados).toHaveLength(0);
  });

  it('rechaza un destino de otra localidad, una localidad inactiva o desconocida', async () => {
    const tractor = await e.activo();
    e.ubicaciones.localidades.set(LOCALIDAD_SUR, { id: LOCALIDAD_SUR, codigo: 'S', nombre: 'Sur', activo: false });

    await expect(
      e.trasladar(
        solicitudDeTraslado([tractor], { localidadId: LOCALIDAD_NORTE, departamentoId: DEPARTAMENTO_DEL_SUR }),
      ),
    ).rejects.toBeInstanceOf(DepartamentoDeOtraLocalidad);
    await expect(e.trasladar(solicitudDeTraslado([tractor], { localidadId: LOCALIDAD_SUR }))).rejects.toBeInstanceOf(
      RecursoNoEncontrado,
    );
    await expect(
      e.trasladar(solicitudDeTraslado([tractor], { localidadId: '99999999-9999-4999-8999-999999999999' })),
    ).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('exige quien recibe, motivo, fecha no futura, renglones sin repetir y sin cantidad parcial', async () => {
    const tractor = await e.activo();
    const intentos = [
      solicitudDeTraslado([tractor], { recibidoPor: ' ' }),
      solicitudDeTraslado([tractor], { motivo: '' }),
      solicitudDeTraslado([tractor], { fecha: '2027-06-16' }),
      solicitudDeTraslado([tractor], { renglones: [] }),
      solicitudDeTraslado([tractor, tractor]),
    ];

    for (const intento of intentos) await expect(e.trasladar(intento)).rejects.toBeInstanceOf(TrasladoInvalido);
    await expect(
      e.trasladar(solicitudDeTraslado([tractor], { renglones: [{ activoId: tractor.id.valor, cantidad: 1 }] })),
    ).resolves.toBeDefined();
    const grupo = await e.activo({ datos: { cantidad: 50 } });
    await expect(
      e.trasladar(solicitudDeTraslado([grupo], { renglones: [{ activoId: grupo.id.valor, cantidad: 20 }] })),
    ).rejects.toBeInstanceOf(TrasladoParcialNoDisponible);
  });

  it('la fecha no puede ser anterior al último traslado del activo ni caer en un mes cerrado', async () => {
    const tractor = await e.activo();
    await e.trasladar(solicitudDeTraslado([tractor], { fecha: '2027-06-10' }));

    await expect(e.trasladar(solicitudDeTraslado([tractor], { fecha: '2027-06-05' }))).rejects.toBeInstanceOf(
      FechaAnteriorAlUltimoTraslado,
    );
    e.cierres.ultimoMes = '2027-06-01';
    await expect(e.trasladar(solicitudDeTraslado([tractor], { fecha: '2027-06-12' }))).rejects.toBeInstanceOf(
      MesCerrado,
    );
  });
});
