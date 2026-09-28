import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { definirConfiguracion, type DefinicionModulo } from './modulos-sistema/definicion-modulo.js';
import { componerApariencia } from './apariencia/contexto.js';
import { componerArchivos } from './archivos/contexto.js';
import { esquemaColorHex } from './apariencia/http/apariencia.esquemas-http.js';
import { MESES_DE_AUDITORIA } from './bitacora/aplicacion/casos-uso/depurar-auditoria.js';
import { componerBitacora } from './bitacora/contexto.js';
import { componerConfiguracion } from './configuracion/contexto.js';
import { variablesRegionales } from './configuracion/variables-regionales.js';
import { dependenciasCompartidas } from './compartido/infraestructura/dependencias-compartidas.js';
import { componerGeografia } from './geografia/contexto.js';
import { componerCuentas } from './cuentas/contexto.js';
import { componerAutorizacion } from './autorizacion/contexto.js';
import { componerIdentidad } from './identidad/contexto.js';

const rutas: FastifyPluginAsync = async (app) => {
  await app.register(componerCuentas());
  await app.register(componerIdentidad(dependenciasCompartidas()));
  await app.register(componerAutorizacion(dependenciasCompartidas()));
  await app.register(componerArchivos(dependenciasCompartidas()));
  await app.register(componerConfiguracion());
  await app.register(componerApariencia());
  await app.register(componerGeografia(dependenciasCompartidas()));
  await app.register(componerBitacora());
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
    {
      clave: 'configuracion.ver',
      descripcion: 'Ver la configuración de la cuenta y la empresa',
      soloSuperacceso: true,
    },
    {
      clave: 'configuracion.gestionar',
      descripcion: 'Cambiar la configuración de la cuenta y la empresa',
      soloSuperacceso: true,
    },
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
      clave: MESES_DE_AUDITORIA,
      descripcion:
        'Meses que se conserva la auditoría (borrados, inactivaciones, anulaciones); lo anterior queda en los respaldos.',
      esquema: z.number().int().min(1).max(120),
      predeterminado: 12,
      niveles: ['instalacion'],
    }),
    ...variablesRegionales,
  ],
  rutas,
};
