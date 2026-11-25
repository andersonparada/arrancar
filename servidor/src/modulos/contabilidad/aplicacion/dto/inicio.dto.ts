import type { DatosDeInicio } from '../../dominio/inicio.js';

/** El inicio de la contabilidad tal como lo ve el usuario. */
export type InicioDto = DatosDeInicio;

/** Lo que se recibe para iniciar la contabilidad o cambiar sus datos. */
export type SolicitudDeInicio = DatosDeInicio;
