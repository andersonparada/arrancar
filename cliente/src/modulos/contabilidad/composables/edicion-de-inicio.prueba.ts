import { describe, expect, it } from 'vitest';
import type { InicioContable } from '../servicios/inicio.api';
import {
  avisoDeMascara,
  avisoDelContador,
  cambiaElInicio,
  datosDelInicio,
  formularioDelInicio,
  inicioVacio,
} from './edicion-de-inicio';

const guardado: InicioContable = {
  fecha: '2026-01-01',
  caso: 'desde_la_carga',
  mascara: '9.9.99.99.999',
  plantilla: null,
  firmaRepresentante: 'Ana López',
  firmaContador: null,
  registroDelContador: null,
};

describe('inicio de la contabilidad', () => {
  it('empieza con la máscara propuesta y desde el inicio de la empresa', () => {
    expect(inicioVacio()).toMatchObject({ caso: 'desde_la_carga', mascara: '9.9.99.99.999', fecha: '' });
  });

  it('ida y vuelta: lo vacío se manda como nulo', () => {
    const formulario = formularioDelInicio(guardado);
    expect(formulario.firmaContador).toBe('');
    expect(datosDelInicio({ ...formulario, mascara: ' 9.9.99.99.999 ', firmaRepresentante: '  ' })).toEqual({
      ...guardado,
      firmaRepresentante: null,
    });
  });

  it('avisa de una máscara mal escrita', () => {
    expect(avisoDeMascara('9.9.99.99.999')).toBeNull();
    expect(avisoDeMascara('9.9')).toContain('4 a 6 niveles');
  });

  it('el contador va con su registro, o ninguno de los dos', () => {
    const base = { firmaContador: '', registroDelContador: '' };
    expect(avisoDelContador(base)).toBeNull();
    expect(avisoDelContador({ ...base, firmaContador: 'Luis' })).toContain('registro');
    expect(avisoDelContador({ ...base, registroDelContador: '123' })).toContain('nombre');
  });

  it('pide confirmar solo si ya estaba iniciada y cambia la fecha o el caso', () => {
    const formulario = formularioDelInicio(guardado);
    expect(cambiaElInicio(null, formulario)).toBe(false);
    expect(cambiaElInicio(guardado, formulario)).toBe(false);
    expect(cambiaElInicio(guardado, { ...formulario, fecha: '2026-02-01' })).toBe(true);
    expect(cambiaElInicio(guardado, { ...formulario, caso: 'posterior' })).toBe(true);
  });
});
