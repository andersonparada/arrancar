import { z } from 'zod';
import { definirConfiguracion } from '../modulos-sistema/definicion-modulo.js';

/** Claves de la configuración del correo: todas de nivel instalación (las cambia Soporte). */
export const CLAVES_DE_CORREO = {
  topePorHoraPorCuenta: 'core.correo.tope_por_hora_por_cuenta',
  topePorDiaPorCuenta: 'core.correo.tope_por_dia_por_cuenta',
  topePorDiaPorDestinatario: 'core.correo.tope_por_dia_por_destinatario',
  topePorHoraDeLaInstalacion: 'core.correo.tope_por_hora_de_la_instalacion',
  diasDeConservacionDelContenido: 'core.correo.dias_de_conservacion_del_contenido',
} as const;

/** Las variables `core.correo.*` (C5, C13). El servidor SMTP no es configuración: vive cifrado en su tabla. */
export const variablesDeCorreo = [
  definirConfiguracion({
    clave: CLAVES_DE_CORREO.topePorHoraPorCuenta,
    descripcion: 'Máximo de correos por hora que puede encolar una cuenta (todas sus empresas).',
    esquema: z.number().int().min(1).max(10_000),
    predeterminado: 100,
    niveles: ['instalacion'],
  }),
  definirConfiguracion({
    clave: CLAVES_DE_CORREO.topePorDiaPorCuenta,
    descripcion: 'Máximo de correos por día que puede encolar una cuenta (todas sus empresas).',
    esquema: z.number().int().min(1).max(50_000),
    predeterminado: 500,
    niveles: ['instalacion'],
  }),
  definirConfiguracion({
    clave: CLAVES_DE_CORREO.topePorDiaPorDestinatario,
    descripcion: 'Máximo de correos por día que una cuenta puede mandar a una misma dirección.',
    esquema: z.number().int().min(1).max(500),
    predeterminado: 20,
    niveles: ['instalacion'],
  }),
  definirConfiguracion({
    clave: CLAVES_DE_CORREO.topePorHoraDeLaInstalacion,
    descripcion: 'Máximo de correos por hora de toda la instalación; manténgalo por debajo del cupo del proveedor.',
    esquema: z.number().int().min(1).max(100_000),
    predeterminado: 1000,
    niveles: ['instalacion'],
  }),
  definirConfiguracion({
    clave: CLAVES_DE_CORREO.diasDeConservacionDelContenido,
    descripcion:
      'Días que se conserva el cuerpo y el adjunto de los correos terminados; sus datos (a quién, qué, cuándo, resultado) se conservan según la auditoría.',
    esquema: z.number().int().min(7).max(365),
    predeterminado: 30,
    niveles: ['instalacion'],
  }),
];
