import { beforeEach, describe, expect, it } from 'vitest';
import {
  MejoraConCambiosPosteriores,
  MejoraConLibrosUsados,
  MejoraInvalida,
  MejoraNoAnulable,
} from '../../../dominio/errores-de-mejora.js';
import {
  armarMejoras,
  solicitudDeMejora,
  type EscenarioDeMejoras,
} from '../../../pruebas/escenario-de-mejoras.soporte.js';

let e: EscenarioDeMejoras;

beforeEach(() => {
  e = armarMejoras();
});

describe('AnularMejora', () => {
  it('anula la mejora y sus costos, deja sin efecto sus tramos y queda en la auditoría', async () => {
    const activo = await e.activoEnUso();
    const mejora = await e.registrar(activo.id.valor);
    e.publicador.publicados.length = 0;

    const anulada = await e.anular(mejora.id, 'Se registró por error');

    expect(anulada).toMatchObject({ estado: 'anulada', motivoDeAnulacion: 'Se registró por error', monto: '0.00' });
    expect((await e.vigentes(activo.id.valor)).map((t) => t.causa)).toEqual(['inicio_de_uso', 'inicio_de_uso']);
    expect(await e.costos.vigentesDeMejora(mejora.id)).toHaveLength(0);
    expect(e.auditoria.entradas).toMatchObject([
      { recurso: 'activos-fijos.mejoras', registroId: mejora.id, accion: 'anular', motivo: 'Se registró por error' },
    ]);
    expect(e.auditoria.entradas[0]!.anterior).toMatchObject({ estado: 'vigente', monto: '50000.00' });
    expect(e.publicador.nombres()).toEqual(['activos-fijos.costo_anulado']);
  });

  it('la vida nueva que dio la mejora se repone con el tramo que vuelve a regir', async () => {
    const activo = await e.activoEnUso();
    const mejora = await e.registrar(activo.id.valor, solicitudDeMejora({ vidaUtilRestanteContableMeses: 120 }));

    await e.anular(mejora.id);

    expect(activo.instantanea().vidaUtilContableMeses).toBe(60);
  });

  it('no se anula si un cierre ya usó su depreciación', async () => {
    const activo = await e.activoEnUso();
    const mejora = await e.registrar(activo.id.valor);
    e.cierres.mejorasUsadas.add(mejora.id);

    await expect(e.anular(mejora.id)).rejects.toBeInstanceOf(MejoraConLibrosUsados);
  });

  it('no se anula si hay otro cambio de depreciación después: primero se anula el más reciente', async () => {
    const activo = await e.activoEnUso();
    const primera = await e.registrar(activo.id.valor);
    const segunda = await e.registrar(activo.id.valor, solicitudDeMejora({ fecha: '2027-06-12' }));

    await expect(e.anular(primera.id)).rejects.toBeInstanceOf(MejoraConCambiosPosteriores);
    await e.anular(segunda.id);
    await expect(e.anular(primera.id)).resolves.toMatchObject({ estado: 'anulada' });
  });

  it('una mejora anulada no se anula otra vez y el motivo es obligatorio', async () => {
    const activo = await e.activoEnUso();
    const mejora = await e.registrar(activo.id.valor);

    await expect(e.anular(mejora.id, '   ')).rejects.toBeInstanceOf(MejoraInvalida);
    await e.anular(mejora.id);
    await expect(e.anular(mejora.id)).rejects.toBeInstanceOf(MejoraNoAnulable);
  });
});
