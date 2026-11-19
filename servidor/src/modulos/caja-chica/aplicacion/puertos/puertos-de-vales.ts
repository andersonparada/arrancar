import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import type { ValeProvisional } from '../../dominio/vales-provisionales.js';

/** Un vale provisional por guardar (queda abierto); el estado y la anulación los pone la base. */
export interface ValeNuevo {
  fondoId: string;
  numero: number;
  anioDeNumero: number;
  fecha: string;
  entregadoA: string;
  entregadoAUsuarioId: string | null;
  montoCentavos: number;
  motivo: string;
}

export interface LiquidacionDelVale {
  devueltoCentavos: number;
  fechaDeLiquidacion: string;
  liquidadoPor: string;
}

export interface AnulacionDelVale {
  anuladoPor: string;
  motivo: string;
  fechaDeAnulacion: string;
}

/** Las tablas tienen seguridad por empresa y por alcance del fondo (RLS). */
export interface RepositorioDeVales {
  agregar(nuevo: ValeNuevo): Promise<string>;
  buscar(id: string): Promise<ValeProvisional | null>;
  /** Igual que `buscar`, y deja la fila bloqueada para este caso de uso. */
  bloquear(id: string): Promise<ValeProvisional | null>;
  liquidar(id: string, liquidacion: LiquidacionDelVale): Promise<void>;
  anular(id: string, anulacion: AnulacionDelVale): Promise<void>;
}

export interface ConsultasDeVales {
  /** Los vales del fondo (también los liquidados y anulados), el más reciente primero. */
  delFondo(fondoId: string): Promise<ValeProvisional[]>;
  /** Los comprobantes con los que se liquidó el vale (también anulados). */
  comprobantesDelVale(valeId: string): Promise<Comprobante[]>;
}

/** Las variables de configuración de los vales provisionales. */
export interface ConfiguracionDeVales {
  /** Días abierto para avisar «vale viejo»; 0 = sin aviso. */
  diasParaAvisar(operador: Operador): Promise<number>;
}
