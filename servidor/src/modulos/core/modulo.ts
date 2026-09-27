import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { definirConfiguracion, type DefinicionModulo } from './modulos-sistema/definicion-modulo.js';
import { rutasApariencia } from './rutas/apariencia.rutas.js';
import { rutasArchivos } from './rutas/archivos.rutas.js';
import { esquemaColorHex } from './validaciones/apariencia.validaciones.js';
import { rutasAutenticacion } from './rutas/autenticacion.rutas.js';
import { rutasConfiguracion } from './rutas/configuracion.rutas.js';
import { rutasGeografia } from './rutas/geografia.rutas.js';
import { rutasPlataforma } from './rutas/plataforma.rutas.js';
import { rutasRoles } from './rutas/roles.rutas.js';
import { rutasUsuarios } from './rutas/usuarios.rutas.js';

const rutas: FastifyPluginAsync = async (app) => {
  await app.register(rutasAutenticacion);
  await app.register(rutasPlataforma);
  await app.register(rutasUsuarios);
  await app.register(rutasRoles);
  await app.register(rutasArchivos);
  await app.register(rutasConfiguracion);
  await app.register(rutasApariencia);
  await app.register(rutasGeografia);
};

export const moduloCore: DefinicionModulo = {
  clave: 'core',
  nombre: 'Núcleo',
  descripcion: 'Usuarios, roles, permisos, configuración, archivos y la base multiempresa.',
  esencial: true,
  permisos: [
    { clave: 'usuarios.ver', descripcion: 'Ver usuarios de la cuenta' },
    { clave: 'usuarios.gestionar', descripcion: 'Crear usuarios y asignarles empresas y roles' },
    { clave: 'roles.ver', descripcion: 'Ver roles y permisos' },
    { clave: 'roles.gestionar', descripcion: 'Crear, editar y eliminar roles' },
    { clave: 'configuracion.ver', descripcion: 'Ver la configuración de la cuenta y la empresa' },
    { clave: 'configuracion.gestionar', descripcion: 'Cambiar la configuración de la cuenta y la empresa' },
  ],
  configuracion: [
    definirConfiguracion({
      clave: 'core.interfaz.nombre_aplicacion',
      descripcion: 'Nombre que se muestra en la aplicación (útil para instalaciones con marca propia).',
      esquema: z.string().trim().min(1).max(40),
      predeterminado: 'Arrancar',
      niveles: ['instalacion'],
      publica: true,
    }),
    definirConfiguracion({
      clave: 'core.apariencia.color_principal',
      descripcion: 'Color del menú lateral, encabezados y pantalla de inicio de sesión.',
      esquema: esquemaColorHex,
      predeterminado: '#1f4d2c',
      niveles: ['instalacion'],
      publica: true,
    }),
    definirConfiguracion({
      clave: 'core.apariencia.color_acento',
      descripcion: 'Color de resaltado: iniciales del usuario, marcas y detalles del menú.',
      esquema: esquemaColorHex,
      predeterminado: '#e9c46a',
      niveles: ['instalacion'],
      publica: true,
    }),
    definirConfiguracion({
      clave: 'core.apariencia.version_logo',
      descripcion: 'Versión del logo propio de la instalación (se cambia al subir uno nuevo).',
      esquema: z.string().max(20).nullable(),
      predeterminado: null,
      niveles: ['instalacion'],
      publica: true,
    }),
    definirConfiguracion({
      clave: 'core.regional.zona_horaria',
      descripcion: 'Zona horaria para fechas y recordatorios.',
      esquema: z.string().refine((zona) => Intl.supportedValuesOf('timeZone').includes(zona), 'Zona horaria desconocida.'),
      predeterminado: 'America/Guatemala',
      niveles: ['instalacion', 'cuenta', 'empresa'],
      publica: true,
    }),
  ],
  rutas,
};
