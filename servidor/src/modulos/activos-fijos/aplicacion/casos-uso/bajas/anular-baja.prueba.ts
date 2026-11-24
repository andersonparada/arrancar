import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { BajaDeComponenteConSuPrincipal, BajaInvalida, BajaNoAnulable } from '../../../dominio/errores-de-baja.js';
import { MesCerrado } from '../../../dominio/errores-de-depreciacion.js';
import {
  armarBajas,
  solicitudDeBaja,
  solicitudDeVenta,
  type EscenarioDeBajas,
} from '../../../pruebas/escenario-de-bajas.soporte.js';

let e: EscenarioDeBajas;

beforeEach(() => {
  e = armarBajas();
});

describe('AnularBaja', () => {
  it('devuelve el activo a uso, deja la baja anulada con su motivo y la auditoría con la baja como estaba', async () => {
    const camioneta = await e.activoEnUso();
    const baja = await e.darDeBaja(solicitudDeBaja(camioneta));
    e.publicador.publicados.length = 0;

    const anulada = await e.anular(baja.id, 'Era otro vehículo');

    expect(anulada).toMatchObject({ estado: 'anulada', motivoDeAnulacion: 'Era otro vehículo', avisos: [] });
    expect(e.estadoDe(camioneta)).toMatchObject({ estado: 'en_uso', fechaDeBaja: null });
    expect(e.auditoria.entradas).toMatchObject([
      { recurso: 'activos-fijos.bajas', registroId: baja.id, accion: 'anular', motivo: 'Era otro vehículo' },
    ]);
    expect(e.auditoria.entradas[0]!.anterior).toMatchObject({ estado: 'vigente', numero: 1, costo: '250000.00' });
    expect(e.publicador.nombres()).toEqual(['activos-fijos.baja_anulada']);
  });

  it('anula también una venta y el activo puede venderse de nuevo', async () => {
    const camioneta = await e.activoEnUso();
    const venta = await e.vender(solicitudDeVenta(camioneta));

    await e.anular(venta.id);
    const otra = await e.vender(solicitudDeVenta(camioneta, { fecha: '2027-06-12' }));

    expect(otra.estado).toBe('vigente');
    expect(otra.numero).toBe(2);
  });

  it('un principal anulado devuelve también a sus componentes; un componente no se anula solo con su principal', async () => {
    const principal = await e.activoEnUso();
    const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
    const motor = await e.activoConCosto(clase, '10000.00', { activoPadreId: principal.id.valor });
    await e.poner(motor);
    const baja = await e.darDeBaja(solicitudDeBaja(principal));
    const delMotor = [...e.bajas.registros.values()].find(
      (registro) => registro.instantanea().activoId === motor.id.valor,
    )!;

    await expect(e.anular(delMotor.id.valor)).rejects.toBeInstanceOf(BajaDeComponenteConSuPrincipal);
    await e.anular(baja.id);

    expect(e.estadoDe(principal).estado).toBe('en_uso');
    expect(e.estadoDe(motor).estado).toBe('en_uso');
    expect(e.auditoria.entradas).toHaveLength(2);
    expect(e.publicador.nombres().filter((nombre) => nombre === 'activos-fijos.baja_anulada')).toHaveLength(2);
  });

  it('un componente dado de baja solo se anula solo', async () => {
    const principal = await e.activoEnUso();
    const clase = await e.claseDe('maquinaria_y_vehiculos', '20.00');
    const motor = await e.activoConCosto(clase, '10000.00', { activoPadreId: principal.id.valor });
    await e.poner(motor);
    const baja = await e.darDeBaja(solicitudDeBaja(motor));

    await e.anular(baja.id);

    expect(e.estadoDe(motor).estado).toBe('en_uso');
  });

  it('no anula una baja ya anulada, de un mes cerrado, sin motivo o que no existe', async () => {
    const camioneta = await e.activoEnUso();
    const baja = await e.darDeBaja(solicitudDeBaja(camioneta));
    await expect(e.anular(baja.id, '  ')).rejects.toBeInstanceOf(BajaInvalida);
    e.cierres.ultimoMes = '2027-06-01';
    await expect(e.anular(baja.id)).rejects.toBeInstanceOf(MesCerrado);
    e.cierres.ultimoMes = null;
    await e.anular(baja.id);

    await expect(e.anular(baja.id)).rejects.toBeInstanceOf(BajaNoAnulable);
    await expect(e.anular('99999999-9999-4999-8999-999999999999')).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });
});
