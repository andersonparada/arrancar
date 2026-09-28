import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import { aCentavos } from './centavos.js';
import {
  MontoInvalido,
  MotivoDeAnulacionInvalido,
  TransferenciaAnulada,
  TransferenciaALaMismaCuenta,
} from './errores.js';

export type TransferenciaId = Identificador<'Transferencia'>;

/** Lo que el usuario puede escribir de una transferencia. */
export interface DatosDeTransferencia {
  cuentaOrigenId: string;
  cuentaDestinoId: string;
  fecha: string;
  monto: string;
  referencia: string | null;
  observaciones: string | null;
}

export interface PropiedadesDeTransferencia extends DatosDeTransferencia {
  id: TransferenciaId;
  empresaId: Identificador<'Empresa'>;
  anuladaEn: Date | null;
  motivoDeAnulacion: string | null;
}

const MAXIMO_DEL_MOTIVO = 500;

function datosValidos(datos: DatosDeTransferencia): DatosDeTransferencia {
  if (aCentavos(datos.monto) <= 0) throw new MontoInvalido();
  if (datos.cuentaOrigenId === datos.cuentaDestinoId) throw new TransferenciaALaMismaCuenta();
  return datos;
}

/**
 * Mueve dinero entre dos cuentas propias de la misma empresa: el caso de uso
 * `RegistrarTransferencia` crea, junto a ella, una nota de débito en el origen y
 * una de crédito en el destino, enlazadas por `transferenciaId`. No se corrige:
 * se anula (lo que anula también sus dos notas) y se registra otra.
 */
export class Transferencia extends Entidad<TransferenciaId> {
  private constructor(private propiedades: PropiedadesDeTransferencia) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeTransferencia): Transferencia {
    return new Transferencia({
      ...datosValidos(datos),
      empresaId,
      id: Identificador.nuevo(),
      anuladaEn: null,
      motivoDeAnulacion: null,
    });
  }

  static reconstruir(propiedades: PropiedadesDeTransferencia): Transferencia {
    return new Transferencia(propiedades);
  }

  /** @throws TransferenciaAnulada si ya está anulada; MotivoDeAnulacionInvalido si falta el motivo. */
  anular(motivo: string): void {
    if (this.estaAnulada) throw new TransferenciaAnulada();
    const motivoDeAnulacion = motivo.trim();
    if (!motivoDeAnulacion || motivoDeAnulacion.length > MAXIMO_DEL_MOTIVO) throw new MotivoDeAnulacionInvalido();
    this.propiedades = { ...this.propiedades, anuladaEn: new Date(), motivoDeAnulacion };
  }

  get estaAnulada(): boolean {
    return this.propiedades.anuladaEn !== null;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeTransferencia> {
    return { ...this.propiedades };
  }
}
