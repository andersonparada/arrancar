import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador, type CuentaId } from '../../core/compartido/dominio/identificador.js';
import { NombreDeFormatoInvalido } from './errores-de-impresion.js';
import type { ClaveDePlantilla } from './formatos-de-cheque/plantillas.js';

export type FormatoGuardadoId = Identificador<'FormatoDeCheque'>;

const MAXIMO_DEL_NOMBRE = 80;

/** Lo que escribe quien arma un formato: una plantilla de fábrica y lo que difiere de ella. */
export interface DatosDeFormatoGuardado {
  nombre: string;
  base: ClaveDePlantilla;
  ajustes: Record<string, unknown>;
}

export interface PropiedadesDeFormatoGuardado extends DatosDeFormatoGuardado {
  id: FormatoGuardadoId;
  /** Es de la cuenta suscriptora: la impresora de la oficina sirve a todas sus empresas. */
  cuentaId: CuentaId;
  /** Cuándo se confirmó «la prueba quedó alineada»; vuelve a `null` al cambiar la base o los ajustes. */
  probadoEn: Date | null;
  activo: boolean;
}

/** @throws NombreDeFormatoInvalido si el nombre queda vacío o pasa de 80 caracteres. */
function datosValidos(datos: DatosDeFormatoGuardado): DatosDeFormatoGuardado {
  const nombre = datos.nombre.trim();
  if (!nombre || nombre.length > MAXIMO_DEL_NOMBRE) throw new NombreDeFormatoInvalido(MAXIMO_DEL_NOMBRE);
  return { ...datos, nombre };
}

/**
 * Un formato de impresión de cheques de la cuenta: su plantilla de fábrica y sus ajustes. Cada cambio de la plantilla o
 * de los ajustes anula la prueba de alineación (hay que volver a probarlo). Los ajustes los revisa quien llama
 * (`resolverFormato`); aquí solo van las reglas del formato mismo.
 */
export class FormatoGuardado extends Entidad<FormatoGuardadoId> {
  private constructor(private propiedades: PropiedadesDeFormatoGuardado) {
    super(propiedades.id);
  }

  static crear(cuentaId: CuentaId, datos: DatosDeFormatoGuardado): FormatoGuardado {
    return new FormatoGuardado({
      ...datosValidos(datos),
      cuentaId,
      id: Identificador.nuevo(),
      probadoEn: null,
      activo: true,
    });
  }

  static reconstruir(propiedades: PropiedadesDeFormatoGuardado): FormatoGuardado {
    return new FormatoGuardado(propiedades);
  }

  /** Cambia el nombre, la plantilla o los ajustes; si cambian la plantilla o los ajustes, la prueba se pierde. */
  cambiarDatos(datos: DatosDeFormatoGuardado): void {
    const nuevos = datosValidos(datos);
    const { base, ajustes } = this.propiedades;
    const cambioElPapel = base !== nuevos.base || JSON.stringify(ajustes) !== JSON.stringify(nuevos.ajustes);
    this.propiedades = { ...this.propiedades, ...nuevos, probadoEn: cambioElPapel ? null : this.propiedades.probadoEn };
  }

  /** La prueba de alineación quedó bien. */
  marcarProbado(cuando: Date): void {
    this.propiedades = { ...this.propiedades, probadoEn: cuando };
  }

  inactivar(): void {
    this.propiedades = { ...this.propiedades, activo: false };
  }

  reactivar(): void {
    this.propiedades = { ...this.propiedades, activo: true };
  }

  get estaActivo(): boolean {
    return this.propiedades.activo;
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeFormatoGuardado> {
    return { ...this.propiedades };
  }
}
