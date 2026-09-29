import { describe, expect, it } from 'vitest';
import type { DatosConcepto, Concepto } from '../../servicios/conceptos.api';
import { datosDeConcepto, edicionDe } from './edicion-de-concepto';

const datos: DatosConcepto = {
  nombre: 'Registro de prueba',
  aplicaA: 'credito',
  actividadDeFlujo: 'operacion',
  grupoDeFlujo: 'Registro de prueba',
  esCargoBancario: false,
  pideDatosDeIntereses: false,
  admiteFactura: false,
  activo: true,
};
const concepto: Concepto = { id: 'registro-1', ...datos, claveDeSistema: null };

describe('ventana de conceptos', () => {
  it('lo que se abre para editar se manda igual si no se cambia nada', () => {
    expect(datosDeConcepto(edicionDe(concepto))).toEqual(datos);
    expect(edicionDe(concepto).id).toBe(concepto.id);
  });

  it('un registro nuevo empieza sin id', () => {
    expect(edicionDe()).toMatchObject({ abierta: true, id: null });
  });

  it('lo que no se llena se manda como null', () => {
    expect(datosDeConcepto(edicionDe())).toMatchObject({ grupoDeFlujo: null });
  });
});
