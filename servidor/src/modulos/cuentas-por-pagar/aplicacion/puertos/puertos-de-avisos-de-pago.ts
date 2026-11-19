import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { CorreosDelProveedor } from '../../dominio/aviso-de-pago.js';
import type { ComprobanteDePagoDto } from '../dto/comprobante-de-pago.dto.js';

/** Cuándo sale el aviso: cuando alguien lo pide, o solo al registrar el pago. */
export type EnvioDelAviso = 'manual' | 'automatico';

/** Lo que la empresa configuró para sus avisos de pago (empresa, o instalación si no cambió nada). */
export interface AjustesDelAviso {
  envio: EnvioDelAviso;
  asunto: string;
  mensaje: string;
  adjuntarComprobante: boolean;
  copiaALaEmpresa: boolean;
}

export interface ConfiguracionDelAviso {
  de(operador: Pick<Operador, 'cuentaId' | 'empresaId'>): Promise<AjustesDelAviso>;
}

/** Los correos registrados del proveedor los da Terceros por el mediador: este módulo no lo importa. */
export interface CorreosDelProveedorDeTerceros {
  obtener(operador: Operador, proveedorId: string): Promise<CorreosDelProveedor>;
}

/** El nombre y el correo de la empresa que avisa (el correo es opcional: copia y «Responder a»). */
export interface EmpresaDelAviso {
  nombre: string;
  correo: string | null;
}

export interface DatosDeLaEmpresaParaElAviso {
  obtener(operador: Operador): Promise<EmpresaDelAviso>;
}

/**
 * El operador de un usuario en una empresa, con su alcance, para quien actúa sin petición (el suscriptor de eventos).
 * `null` si el usuario ya no puede trabajar en la empresa.
 */
export interface OperadorDelUsuario {
  de(usuarioId: string, empresaId: string): Promise<Operador | null>;
}

/** El comprobante del pago, el mismo que imprime la pantalla. */
export interface ComprobantesDePago {
  ejecutar(operador: Operador, pagoId: string): Promise<ComprobanteDePagoDto>;
}
