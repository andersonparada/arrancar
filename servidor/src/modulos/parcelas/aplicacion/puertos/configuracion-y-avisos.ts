import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type { FactoresDeSuperficie } from '../../dominio/superficie.js';

/** Lo que Parcelas lee de su configuración (empresa e instalación). */
export interface ConfiguracionDeParcelas {
  factores(operador: Operador): Promise<FactoresDeSuperficie>;
  /** Cuántos niveles de parcelas se permiten bajo una localidad. */
  nivelesMaximos(operador: Operador): Promise<number>;
  /** Las varas por lado de la cuerda que usa la empresa. */
  varasPorLadoDeCuerda(operador: Operador): Promise<number>;
}

/** Cuando se va a inactivar o eliminar una parcela. */
export interface AvisoDeBajaDeParcela {
  parcelaId: string;
  /** La fecha a partir de la cual deja de estar activa. */
  fecha: string;
}

/**
 * Los módulos de rubro (Ganadería, Cultivos) rechazan la baja si la parcela tiene una ocupación o un ciclo abierto: su
 * error deshace la operación. Sin escucha, se da la baja.
 */
export interface AvisosDeParcela {
  porInactivar(operador: Operador, aviso: AvisoDeBajaDeParcela): Promise<void>;
  porEliminar(operador: Operador, aviso: { parcelaId: string }): Promise<void>;
}
