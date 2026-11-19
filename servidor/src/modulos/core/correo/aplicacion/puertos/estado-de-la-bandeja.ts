import type { EstadoDeCorreo } from '../../dominio/estado-de-correo.js';
import type { CorreoFallidoDto } from '../dto/bandeja-de-soporte.dto.js';

export interface ConteoPorEstado {
  estado: EstadoDeCorreo;
  total: number;
  masAntiguo: Date;
}

/**
 * Lo que Soporte lee de la bandeja de todas las empresas, por funciones `security definer` de solo lectura
 * (migración 0027): sin unidad de trabajo, porque no es de una empresa.
 */
export interface EstadoDeLaBandeja {
  conteos(): Promise<ConteoPorEstado[]>;
  fallidosRecientes(limite: number): Promise<CorreoFallidoDto[]>;
}
