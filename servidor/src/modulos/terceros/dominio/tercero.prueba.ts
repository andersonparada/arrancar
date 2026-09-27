import { describe, expect, it } from 'vitest';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { Telefono } from '../../core/compartido/dominio/objetos-valor/telefono.js';
import { Contacto } from './contacto.js';
import { FaltaElNombre, TerceroInactivo } from './errores.js';
import { IdentidadDeTercero, type NombresDeTercero } from './identidad-de-tercero.js';
import { Tercero, type DatosDeTercero } from './tercero.js';

const cuentaId = Identificador.desde<'Cuenta'>(crypto.randomUUID());
const sinNombres: NombresDeTercero = { nombres: null, apellidos: null, razonSocial: null, nombreComercial: null };

function persona(nombres: Partial<NombresDeTercero>) {
  return IdentidadDeTercero.crear('individual', { ...sinNombres, ...nombres });
}

function datos(cambios: Partial<DatosDeTercero> = {}): DatosDeTercero {
  return {
    identidad: persona({ nombres: 'Juan', apellidos: 'Pérez' }),
    nit: null,
    dpi: null,
    telefono: null,
    whatsapp: null,
    correo: null,
    ubicacion: { departamentoCodigo: null, municipioCodigo: null, direccion: null },
    fotoArchivoId: null,
    notas: null,
    activo: true,
    ...cambios,
  };
}

function nombresDeEventos(tercero: Tercero): string[] {
  return tercero.extraerEventos().map((evento) => evento.nombre);
}

describe('identidad y nombre para mostrar', () => {
  it('una persona se muestra con nombres y apellidos, sin espacios sobrantes', () => {
    expect(persona({ nombres: ' Juan ', apellidos: '' }).nombreParaMostrar).toBe('Juan');
    expect(persona({ nombres: 'Juan', apellidos: 'Pérez' }).nombreParaMostrar).toBe('Juan Pérez');
  });

  it('el nombre comercial tiene prioridad, sea persona o empresa', () => {
    const ferreteria = persona({ nombres: 'Juan', nombreComercial: 'Ferretería Juan' });
    const empresa = IdentidadDeTercero.crear('juridica', {
      ...sinNombres,
      razonSocial: 'Agro, S.A.',
      nombreComercial: 'AgroSur',
    });

    expect(ferreteria.nombreParaMostrar).toBe('Ferretería Juan');
    expect(empresa.nombreParaMostrar).toBe('AgroSur');
  });

  it('una empresa sin nombre comercial se muestra con su razón social', () => {
    const empresa = IdentidadDeTercero.crear('juridica', { ...sinNombres, razonSocial: 'Agropecuaria, S.A.' });

    expect(empresa.nombreParaMostrar).toBe('Agropecuaria, S.A.');
  });

  it('exige nombres a una persona y razón social o nombre comercial a una empresa', () => {
    expect(() => persona({ apellidos: 'Solo Apellido' })).toThrow(FaltaElNombre);
    expect(() => IdentidadDeTercero.crear('juridica', sinNombres)).toThrow(FaltaElNombre);
  });
});

describe('papeles', () => {
  it('asignar un papel lo deja activo y lo avisa; volver a asignarlo cambia sus datos', () => {
    const tercero = Tercero.registrar(cuentaId, datos());
    tercero.extraerEventos();

    tercero.asignarPapel({ tipo: 'cliente', clase: 'directo', activo: true, notas: null });
    tercero.asignarPapel({ tipo: 'cliente', clase: 'intermediario', activo: true, notas: null });

    expect(tercero.papel('cliente')).toMatchObject({ clase: 'intermediario', activo: true });
    expect(nombresDeEventos(tercero)).toEqual(['terceros.papel_asignado', 'terceros.papel_asignado']);
  });

  it('quitar un papel lo inactiva y conserva sus datos', () => {
    const tercero = Tercero.registrar(cuentaId, datos());
    tercero.asignarPapel({ tipo: 'proveedor', categoriaId: null, activo: true, notas: 'Paga al contado' });

    tercero.quitarPapel('proveedor');

    expect(tercero.papel('proveedor')).toMatchObject({ activo: false, notas: 'Paga al contado' });
  });

  it('no se asignan papeles a un tercero inactivo', () => {
    const tercero = Tercero.registrar(cuentaId, datos({ activo: false }));

    expect(() => tercero.asignarPapel({ tipo: 'cliente', clase: 'directo', activo: true, notas: null })).toThrow(
      TerceroInactivo,
    );
  });
});

describe('cambio de datos', () => {
  it('inactivar al tercero inactiva todos sus papeles y avisa que se inactivó', () => {
    const tercero = Tercero.registrar(cuentaId, datos());
    tercero.asignarPapel({ tipo: 'cliente', clase: 'directo', activo: true, notas: null });
    tercero.asignarPapel({ tipo: 'proveedor', categoriaId: null, activo: true, notas: null });
    tercero.extraerEventos();

    tercero.cambiarDatos(datos({ activo: false }));

    expect(tercero.papel('cliente')?.activo).toBe(false);
    expect(tercero.papel('proveedor')?.activo).toBe(false);
    expect(nombresDeEventos(tercero)).toEqual(['terceros.inactivado']);
  });

  it('un cambio que no inactiva solo avisa que se actualizó', () => {
    const tercero = Tercero.registrar(cuentaId, datos());
    tercero.extraerEventos();

    tercero.cambiarDatos(datos({ telefono: Telefono.crear('5555-1234') }));

    expect(nombresDeEventos(tercero)).toEqual(['terceros.actualizado']);
  });
});

describe('contactos', () => {
  it('pertenecen a un tercero y necesitan nombre', () => {
    const tercero = Tercero.registrar(cuentaId, datos());
    const de = { terceroId: tercero.id, cuentaId };
    const sinDatos = { cargo: null, telefono: null, whatsapp: null, correo: null, notas: null };

    const contacto = Contacto.agregar(de, { nombre: ' Encargada ', ...sinDatos });

    expect(contacto.esDe(tercero.id)).toBe(true);
    expect(contacto.instantanea().nombre).toBe('Encargada');
    expect(() => Contacto.agregar(de, { nombre: '  ', ...sinDatos })).toThrow(FaltaElNombre);
  });
});
