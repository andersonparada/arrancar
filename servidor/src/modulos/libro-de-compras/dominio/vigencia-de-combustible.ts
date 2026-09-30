import { DatoInvalido, ReglaDeNegocioInfringida } from '../../core/compartido/dominio/errores.js';
import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';

export type VigenciaDeCombustibleId = Identificador<'VigenciaDeCombustible'>;

/** Lo que el usuario puede escribir de una vigencia de combustible. */
export interface DatosDeVigenciaDeCombustible {
  combustibleId: string;
  idpPorGalon: string;
  porcentajeDeEtanol: string;
  vigenteDesde: string;
  vigenteHasta: string | null;
}

export interface PropiedadesDeVigenciaDeCombustible extends DatosDeVigenciaDeCombustible {
  id: VigenciaDeCombustibleId;
  empresaId: Identificador<'Empresa'>;
}

/** Cuándo se usó por última vez una vigencia: la fecha de emisión del documento más reciente que la aplicó. */
export interface UsoDeVigencia {
  ultimaFechaDeEmision: string;
}

/** Un dato de la vigencia de combustible no cumple sus reglas. */
export class VigenciaDeCombustibleInvalido extends DatoInvalido {
  readonly codigo = 'vigencia_de_combustible_invalido';
}

/** Una vigencia que ya usan documentos no admite ese cambio. */
export class VigenciaDeCombustibleEnUso extends ReglaDeNegocioInfringida {
  readonly codigo = 'vigencia_de_combustible_en_uso';
}

const DIA_EN_MILISEGUNDOS = 24 * 60 * 60 * 1000;

/** El día anterior a `fecha` (`aaaa-mm-dd`), sin depender de la zona horaria. */
export function diaAnterior(fecha: string): string {
  const dia = new Date(`${fecha}T00:00:00Z`).getTime() - DIA_EN_MILISEGUNDOS;
  return new Date(dia).toISOString().slice(0, 10);
}

/** Un número con hasta dos decimales, en centésimas enteras (sin `parseFloat`); `null` si no lo es. */
export function aCentesimas(texto: string): number | null {
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(texto.trim());
  if (!partes) return null;
  return Number(partes[1]) * 100 + Number((partes[2] ?? '').padEnd(2, '0'));
}

function exigirCentesimas(texto: string, campo: string): number {
  const centesimas = aCentesimas(texto);
  if (centesimas === null) throw new VigenciaDeCombustibleInvalido(`"${campo}" debe ser un número sin signo.`);
  return centesimas;
}

function exigirFecha(texto: string, campo: string): void {
  const valida = /^\d{4}-\d{2}-\d{2}$/.test(texto) && new Date(`${texto}T00:00:00Z`).toISOString().startsWith(texto);
  if (!valida) throw new VigenciaDeCombustibleInvalido(`"${campo}" no es una fecha válida.`);
}

/** Las reglas de los datos: tasa sin signo, etanol de 0 a 100 y fechas en orden. */
function datosValidos(datos: DatosDeVigenciaDeCombustible): DatosDeVigenciaDeCombustible {
  exigirCentesimas(datos.idpPorGalon, 'IDP por galón');
  if (exigirCentesimas(datos.porcentajeDeEtanol, 'Porcentaje de etanol') > 10000) {
    throw new VigenciaDeCombustibleInvalido('"Porcentaje de etanol" debe estar entre 0 y 100.');
  }
  exigirFecha(datos.vigenteDesde, 'Vigente desde');
  if (datos.vigenteHasta !== null) {
    exigirFecha(datos.vigenteHasta, 'Vigente hasta');
    if (datos.vigenteHasta < datos.vigenteDesde) {
      throw new VigenciaDeCombustibleInvalido('"Vigente hasta" no puede ser anterior a "Vigente desde".');
    }
  }
  return { ...datos };
}

const mismaTasa = (a: DatosDeVigenciaDeCombustible, b: DatosDeVigenciaDeCombustible): boolean =>
  aCentesimas(a.idpPorGalon) === aCentesimas(b.idpPorGalon) &&
  aCentesimas(a.porcentajeDeEtanol) === aCentesimas(b.porcentajeDeEtanol);

/** Vigencia de la tasa de IDP de un combustible de la empresa. Sus reglas van aquí, en el dominio. */
export class VigenciaDeCombustible extends Entidad<VigenciaDeCombustibleId> {
  private constructor(private propiedades: PropiedadesDeVigenciaDeCombustible) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeVigenciaDeCombustible): VigenciaDeCombustible {
    return new VigenciaDeCombustible({ ...datosValidos(datos), empresaId, id: Identificador.nuevo() });
  }

  static reconstruir(propiedades: PropiedadesDeVigenciaDeCombustible): VigenciaDeCombustible {
    return new VigenciaDeCombustible(propiedades);
  }

  /** Sigue rigiendo: no tiene fecha de cierre. */
  estaAbierta(): boolean {
    return this.propiedades.vigenteHasta === null;
  }

  /** Si `datos` cambia la tasa, el etanol o las fechas (lo que se audita como corrección). */
  seCorrigeCon(datos: DatosDeVigenciaDeCombustible): boolean {
    const { vigenteDesde, vigenteHasta } = this.propiedades;
    return (
      !mismaTasa(this.propiedades, datos) || vigenteDesde !== datos.vigenteDesde || vigenteHasta !== datos.vigenteHasta
    );
  }

  /**
   * Cambia sus datos. El combustible no se cambia nunca; y una vigencia usada por documentos conserva su
   * tasa, su etanol y su inicio, y solo puede cerrarse en o después de la última emisión que la usa.
   * @throws VigenciaDeCombustibleEnUso si el cambio contradice el uso.
   */
  cambiarDatos(datos: DatosDeVigenciaDeCombustible, uso: UsoDeVigencia | null): void {
    if (datos.combustibleId !== this.propiedades.combustibleId) {
      throw new VigenciaDeCombustibleInvalido(
        'No se puede cambiar el combustible: elimine la vigencia y regístrela de nuevo.',
      );
    }
    if (uso) this.exigirCambioCompatibleConElUso(datos, uso);
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  /**
   * La cierra el día anterior a `inicioDeLaSiguiente`.
   * @throws VigenciaDeCombustibleEnUso si algún documento la usó después de ese día.
   */
  cerrarAntesDe(inicioDeLaSiguiente: string, uso: UsoDeVigencia | null): void {
    this.cambiarDatos({ ...this.propiedades, vigenteHasta: diaAnterior(inicioDeLaSiguiente) }, uso);
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeVigenciaDeCombustible> {
    return { ...this.propiedades };
  }

  private exigirCambioCompatibleConElUso(datos: DatosDeVigenciaDeCombustible, uso: UsoDeVigencia): void {
    if (!mismaTasa(this.propiedades, datos) || datos.vigenteDesde !== this.propiedades.vigenteDesde) {
      throw new VigenciaDeCombustibleEnUso(
        'Esta vigencia ya se usó en documentos: no se cambia su tasa, su etanol ni su inicio. Registre una vigencia nueva.',
      );
    }
    if (datos.vigenteHasta !== null && datos.vigenteHasta < uso.ultimaFechaDeEmision) {
      throw new VigenciaDeCombustibleEnUso(
        `Esta vigencia se usó en documentos hasta el ${uso.ultimaFechaDeEmision}: no puede cerrarse antes.`,
      );
    }
  }
}
