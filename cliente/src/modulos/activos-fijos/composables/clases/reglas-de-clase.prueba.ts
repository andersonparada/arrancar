import { describe, expect, it } from 'vitest';
import type { Clase } from '../../servicios/clases.api';
import { edicionDe } from './edicion-de-clase';
import {
  AYUDA_DE_PROGRAMAS_Y_LICENCIAS,
  aplicarInciso,
  ayudaDeClase,
  datosParaCambiarEstado,
  esTerreno,
  mensajeDeCambioDeEstado,
  mensajeDeEliminacion,
  ordenarPorNombre,
} from './reglas-de-clase';

const clase: Clase = {
  id: 'c-1',
  nombre: 'Vehículos',
  incisoFiscal: 'maquinaria_y_vehiculos',
  porcentajeFiscal: '20.00',
  vidaUtilContableMeses: 60,
  valorResidualPorcentaje: '5.00',
  activo: true,
};

describe('terrenos', () => {
  it('al elegir terrenos deja 0 % y sin vida útil', () => {
    const edicion = { ...edicionDe(clase), incisoFiscal: 'terrenos' as const };
    aplicarInciso(edicion);
    expect(esTerreno(edicion.incisoFiscal)).toBe(true);
    expect(edicion.porcentajeFiscal).toBe('0');
    expect(edicion.vidaUtilContableMeses).toBe('');
  });

  it('con otro inciso no toca lo escrito', () => {
    const edicion = edicionDe(clase);
    aplicarInciso(edicion);
    expect(edicion.porcentajeFiscal).toBe('20.00');
    expect(edicion.vidaUtilContableMeses).toBe('60');
  });
});

describe('ayuda de programas y licencias', () => {
  it('sale sin importar tildes ni mayúsculas', () => {
    expect(ayudaDeClase(' PROGRAMAS y licéncias')).toBe(AYUDA_DE_PROGRAMAS_Y_LICENCIAS);
    expect(ayudaDeClase('Programas y Licencias')).toBe(AYUDA_DE_PROGRAMAS_Y_LICENCIAS);
  });

  it('otras clases no llevan ayuda', () => {
    expect(ayudaDeClase('Vehículos')).toBeUndefined();
  });
});

describe('inactivar, reactivar y eliminar', () => {
  it('invierte activo y no manda el id', () => {
    const datos = datosParaCambiarEstado(clase);
    expect(datos.activo).toBe(false);
    expect(datos).not.toHaveProperty('id');
    expect(datos.nombre).toBe('Vehículos');
  });

  it('las preguntas dicen qué pasará', () => {
    expect(mensajeDeCambioDeEstado(clase)).toContain('Inactivar');
    expect(mensajeDeCambioDeEstado({ ...clase, activo: false })).toContain('Reactivar');
    expect(mensajeDeEliminacion(clase)).toContain('inactívela');
  });
});

describe('orden', () => {
  it('por nombre, sin distinguir tildes ni mayúsculas, sin alterar la lista original', () => {
    const lista = [
      { ...clase, nombre: 'otros' },
      { ...clase, nombre: 'Edificios' },
      { ...clase, nombre: 'Árboles' },
    ];
    expect(ordenarPorNombre(lista).map((c) => c.nombre)).toEqual(['Árboles', 'Edificios', 'otros']);
    expect(lista[0]!.nombre).toBe('otros');
  });
});
