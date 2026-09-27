import { z } from 'zod';
import { definirConfiguracion, type DefinicionModulo } from '../core/modulos-sistema/definicion-modulo.js';
import { rutasTerceros } from './rutas/terceros.rutas.js';

export const moduloTerceros: DefinicionModulo = {
  clave: 'terceros',
  nombre: 'Terceros',
  descripcion: 'Clientes, proveedores y trabajadores: identidad, contactos y papeles.',
  dependeDe: [],
  permisos: [
    { clave: 'terceros.ver', descripcion: 'Ver el listado y la ficha de terceros (sin DPI de trabajadores)' },
    { clave: 'terceros.gestionar', descripcion: 'Crear, editar e inactivar terceros y sus contactos' },
    { clave: 'clientes.gestionar', descripcion: 'Asignar o quitar el papel de cliente' },
    { clave: 'proveedores.gestionar', descripcion: 'Asignar o quitar el papel de proveedor y editar sus categorías' },
    { clave: 'trabajadores.ver', descripcion: 'Ver el papel de trabajador y sus datos sensibles (DPI, teléfono)' },
    { clave: 'trabajadores.gestionar', descripcion: 'Asignar o quitar el papel de trabajador' },
  ],
  configuracion: [
    definirConfiguracion({
      clave: 'terceros.papeles.habilitados',
      descripcion: 'Papeles de terceros disponibles en esta instalación, cuenta o empresa.',
      esquema: z.array(z.enum(['cliente', 'proveedor', 'trabajador'])),
      predeterminado: ['cliente', 'proveedor', 'trabajador'],
      niveles: ['instalacion', 'cuenta', 'empresa'],
      publica: true,
    }),
    definirConfiguracion({
      clave: 'terceros.trabajadores.dpi_obligatorio',
      descripcion: 'Exige el DPI al asignar el papel de trabajador.',
      esquema: z.boolean(),
      predeterminado: false,
      niveles: ['instalacion', 'cuenta', 'empresa'],
      publica: true,
    }),
    definirConfiguracion({
      clave: 'terceros.clientes.permitir_consumidor_final',
      descripcion: 'Permite registrar clientes como consumidor final (NIT "CF").',
      esquema: z.boolean(),
      predeterminado: true,
      niveles: ['instalacion', 'cuenta', 'empresa'],
      publica: true,
    }),
  ],
  rutas: rutasTerceros,
};
