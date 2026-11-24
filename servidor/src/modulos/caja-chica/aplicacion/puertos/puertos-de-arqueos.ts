import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { Arqueo } from '../../dominio/arqueos.js';
import type { Comprobante } from '../../dominio/comprobantes.js';
import type { ConfiguracionDeControl } from './puertos-de-reposiciones.js';
import type { AnulacionDelComprobante } from './puertos-de-comprobantes.js';

/** Un arqueo por guardar; el estado y la anulación los pone la base. */
export type ArqueoNuevo = Omit<Arqueo, 'estado' | 'fechaDeAnulacion' | 'motivoDeAnulacion' | 'realizadoEn'> & {
  realizadoEn: Date;
};

export interface AnulacionDelArqueo {
  anuladoPor: string;
  motivo: string;
  fechaDeAnulacion: string;
}

/** Las tablas tienen seguridad por empresa y por alcance del fondo (RLS). */
export interface RepositorioDeArqueos {
  agregar(nuevo: ArqueoNuevo): Promise<void>;
  buscar(id: string): Promise<Arqueo | null>;
  /** Igual que `buscar`, y deja la fila bloqueada para este caso de uso. */
  bloquear(id: string): Promise<Arqueo | null>;
  anular(id: string, anulacion: AnulacionDelArqueo): Promise<void>;
}

export interface ConsultasDeArqueos {
  /** Los arqueos del fondo (también los anulados), el más reciente primero. */
  delFondo(fondoId: string): Promise<Arqueo[]>;
  /** Los comprobantes vigentes del fondo que no están en una reposición vigente (lo que el arqueador revisa). */
  pendientesDelFondo(fondoId: string): Promise<Comprobante[]>;
  /** El nombre completo del usuario, para copiarlo al acta del arqueo. */
  nombreDelUsuario(usuarioId: string): Promise<string>;
}

/** El faltante o el sobrante que nace de un arqueo con diferencia: un comprobante del mismo fondo. */
export interface AjusteDeArqueoNuevo {
  arqueoId: string;
  fondoId: string;
  clase: 'faltante' | 'sobrante';
  fecha: string;
  montoCentavos: number;
  descripcion: string;
  destinoDelFaltante: 'perdida' | 'cobrar_al_custodio' | null;
  asignadoPor: string;
}

export interface ComprobantesDelArqueo {
  agregar(nuevo: AjusteDeArqueoNuevo): Promise<string>;
  /** El faltante o sobrante del arqueo (también anulado), si hubo diferencia. */
  delArqueo(arqueoId: string): Promise<Comprobante | null>;
  /** Igual que `delArqueo`, y deja la fila bloqueada para este caso de uso. */
  bloquearDelArqueo(arqueoId: string): Promise<Comprobante | null>;
  anular(id: string, anulacion: AnulacionDelComprobante): Promise<void>;
}

/** Las variables de configuración de los arqueos y su control. */
export interface ConfiguracionDeArqueos extends ConfiguracionDeControl {
  /** Días sin arqueo para avisar; 0 = sin aviso. */
  diasParaAvisar(operador: Operador): Promise<number>;
  /** Días con un vale provisional abierto para avisar en el fondo y en el arqueo; 0 = sin aviso. */
  diasParaAvisarDeVales(operador: Operador): Promise<number>;
}
