import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import { TrasladoInvalido, TrasladoNoAnulable, TrasladoNoEsElUltimo } from '../../../dominio/errores-de-traslado.js';
import {
  armarTraslados,
  LOCALIDAD_NORTE,
  LOCALIDAD_SUR,
  solicitudDeTraslado,
  type EscenarioDeTraslados,
} from '../../../pruebas/escenario-de-traslados.soporte.js';

let e: EscenarioDeTraslados;

beforeEach(() => {
  e = armarTraslados();
});

describe('AnularTraslado', () => {
  it('anula la boleta, devuelve el activo a su ubicación anterior y queda en la auditoría', async () => {
    const tractor = await e.activo({ datos: { cantidad: 1 } });
    const boleta = await e.trasladar(solicitudDeTraslado([tractor]));
    e.publicador.publicados.length = 0;

    const anulada = await e.anular(boleta.grupoId, 'Entregado a otra persona');

    expect(anulada).toMatchObject({ estado: 'anulado', motivoDeAnulacion: 'Entregado a otra persona' });
    expect(tractor.instantanea()).toMatchObject({ localidadId: null, responsable: null, enBodega: false });
    expect(e.auditoria.entradas).toMatchObject([
      {
        recurso: 'activos-fijos.traslados',
        registroId: boleta.grupoId,
        accion: 'anular',
        motivo: 'Entregado a otra persona',
      },
    ]);
    expect(e.auditoria.entradas[0]!.anterior).toMatchObject({ estado: 'vigente', numero: 1 });
    expect(e.publicador.nombres()).toEqual(['activos-fijos.traslado_anulado']);
  });

  it('restaura la ubicación del traslado anterior, no la del alta', async () => {
    const tractor = await e.activo();
    await e.trasladar(solicitudDeTraslado([tractor], { fecha: '2027-06-05' }));
    const segunda = await e.trasladar(
      solicitudDeTraslado([tractor], { fecha: '2027-06-10', localidadId: LOCALIDAD_SUR, responsable: 'Pedro' }),
    );

    await e.anular(segunda.grupoId);

    expect(tractor.instantanea()).toMatchObject({ localidadId: LOCALIDAD_NORTE, responsable: 'Marta López' });
  });

  it('un activo anulado vuelve a poderse trasladar y la boleta anulada deja de ser la última', async () => {
    const tractor = await e.activo();
    const boleta = await e.trasladar(solicitudDeTraslado([tractor]));
    await e.anular(boleta.grupoId);

    await expect(e.trasladar(solicitudDeTraslado([tractor], { fecha: '2027-06-01' }))).resolves.toBeDefined();
  });

  it('con una boleta de varios activos, anula todos y devuelve cada uno a su lugar', async () => {
    const uno = await e.activo();
    const dos = await e.activo();
    const boleta = await e.trasladar(solicitudDeTraslado([uno, dos]));

    await e.anular(boleta.grupoId);

    expect([uno, dos].map((a) => a.instantanea().localidadId)).toEqual([null, null]);
    expect(e.publicador.nombres().filter((n) => n === 'activos-fijos.traslado_anulado')).toHaveLength(2);
  });

  it('solo se anula el último traslado de cada activo', async () => {
    const tractor = await e.activo();
    const primera = await e.trasladar(solicitudDeTraslado([tractor], { fecha: '2027-06-05' }));
    await e.trasladar(solicitudDeTraslado([tractor], { fecha: '2027-06-10', localidadId: LOCALIDAD_SUR }));

    await expect(e.anular(primera.grupoId)).rejects.toBeInstanceOf(TrasladoNoEsElUltimo);
  });

  it('no se anula dos veces, sin motivo, en un mes cerrado ni una boleta que no existe', async () => {
    const tractor = await e.activo();
    const boleta = await e.trasladar(solicitudDeTraslado([tractor]));

    await expect(e.anular(boleta.grupoId, ' ')).rejects.toBeInstanceOf(TrasladoInvalido);
    e.cierres.ultimoMes = '2027-06-01';
    await expect(e.anular(boleta.grupoId)).rejects.toBeInstanceOf(MesCerrado);
    e.cierres.ultimoMes = null;
    await e.anular(boleta.grupoId);
    await expect(e.anular(boleta.grupoId)).rejects.toBeInstanceOf(TrasladoNoAnulable);
    await expect(e.anular(crypto.randomUUID())).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });
});

describe('ObtenerBoleta', () => {
  it('devuelve la boleta con sus renglones y falla si no existe', async () => {
    const tractor = await e.activo();
    const boleta = await e.trasladar(solicitudDeTraslado([tractor]));

    expect(await e.boleta(boleta.grupoId)).toMatchObject({ grupoId: boleta.grupoId, numero: 1 });
    await expect(e.boleta(crypto.randomUUID())).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });
});
