import { describe, expect, it } from 'vitest';
import type { Concepto } from '../../servicios/conceptos.api';
import { edicionDe } from './edicion-de-concepto';
import {
  accionesDeConcepto,
  admiteDatosDeIntereses,
  datosParaCambiarEstado,
  esDeSistema,
  mensajeDeCambioDeEstado,
  ordenarPorNombre,
  sinInteresesSiEsDebito,
} from './reglas-de-concepto';

const delUsuario: Concepto = {
  id: 'c-1',
  nombre: 'Planilla',
  aplicaA: 'debito',
  actividadDeFlujo: 'operacion',
  grupoDeFlujo: null,
  esCargoBancario: false,
  pideDatosDeIntereses: false,
  admiteFactura: false,
  activo: true,
  claveDeSistema: null,
};
const deSistema: Concepto = { ...delUsuario, id: 'c-2', nombre: 'Transferencia', claveDeSistema: 'transferencia' };

describe('acciones según la clave de sistema', () => {
  it('el concepto del usuario se edita, inactiva y elimina', () => {
    expect(esDeSistema(delUsuario)).toBe(false);
    expect(accionesDeConcepto(delUsuario)).toEqual({ editar: true, cambiarEstado: true, eliminar: true });
  });

  it('el concepto de sistema no permite ninguna acción', () => {
    expect(esDeSistema(deSistema)).toBe(true);
    expect(accionesDeConcepto(deSistema)).toEqual({ editar: false, cambiarEstado: false, eliminar: false });
  });
});

describe('datos de intereses', () => {
  it('solo se admiten en créditos y en ambos', () => {
    expect(admiteDatosDeIntereses('credito')).toBe(true);
    expect(admiteDatosDeIntereses('ambos')).toBe(true);
    expect(admiteDatosDeIntereses('debito')).toBe(false);
  });

  it('al pasar a débito se apaga la bandera, y en crédito se respeta', () => {
    const edicion = edicionDe({ ...delUsuario, aplicaA: 'credito', pideDatosDeIntereses: true });
    sinInteresesSiEsDebito(edicion);
    expect(edicion.pideDatosDeIntereses).toBe(true);
    edicion.aplicaA = 'debito';
    sinInteresesSiEsDebito(edicion);
    expect(edicion.pideDatosDeIntereses).toBe(false);
  });
});

describe('inactivar y reactivar', () => {
  it('manda todos los datos con activo invertido y sin id ni clave', () => {
    const datos = datosParaCambiarEstado(delUsuario);
    expect(datos.activo).toBe(false);
    expect(datos).not.toHaveProperty('id');
    expect(datos).not.toHaveProperty('claveDeSistema');
    expect(datosParaCambiarEstado({ ...delUsuario, activo: false }).activo).toBe(true);
  });

  it('la pregunta cambia según el estado', () => {
    expect(mensajeDeCambioDeEstado(delUsuario)).toContain('Inactivar');
    expect(mensajeDeCambioDeEstado({ ...delUsuario, activo: false })).toContain('Reactivar');
  });
});

describe('orden por nombre', () => {
  it('ordena sin distinguir tildes ni mayúsculas y no altera la lista original', () => {
    const lista = [
      { ...delUsuario, nombre: 'préstamo' },
      { ...delUsuario, nombre: 'Comisiones' },
      { ...delUsuario, nombre: 'Aporte' },
    ];
    expect(ordenarPorNombre(lista).map((c) => c.nombre)).toEqual(['Aporte', 'Comisiones', 'préstamo']);
    expect(lista[0]?.nombre).toBe('préstamo');
  });
});
