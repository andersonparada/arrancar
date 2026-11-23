import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import type { DatosDeParcela, DatosEditablesDeParcela } from './datos-de-parcela.js';
import {
  MadreInactiva,
  NivelMaximoDeParcelas,
  ParcelaDeOtraLocalidad,
  SuperficieUtilMayorQueTotal,
} from './errores-de-parcela.js';
import { codigoValido, puntoValido, textoObligatorio, textoOpcional } from './reglas-de-parcela.js';
import { textoACentesimas } from './superficie.js';

export type ParcelaId = Identificador<'Parcela'>;
export type { DatosDeParcela, DatosEditablesDeParcela, FormaDeTenencia } from './datos-de-parcela.js';
export { FORMAS_DE_TENENCIA } from './datos-de-parcela.js';

export interface PropiedadesDeParcela extends DatosDeParcela {
  id: ParcelaId;
  empresaId: Identificador<'Empresa'>;
  localidadId: string;
  parcelaMadreId: string | null;
  nivel: number;
  /** Copia de la medición vigente (la escribe el caso de uso de mediciones), en m² con dos decimales. */
  superficieTotalM2: string | null;
  superficieUtilM2: string | null;
  activo: boolean;
}

/** Dónde se crea la parcela: su localidad, su madre (si tiene) y cuántos niveles se permiten. */
export interface UbicacionDeParcela {
  localidadId: string;
  madre: Parcela | null;
  nivelesMaximos: number;
}

/** Recorta los textos y revisa el punto y las colindancias; solo salen los datos editables. */
function datosEditablesValidos(datos: DatosEditablesDeParcela): DatosEditablesDeParcela {
  const colindancia = (texto: string | null, lado: string) => textoOpcional(texto, `Colindancia ${lado}`, 300);
  return {
    tipoId: datos.tipoId,
    nombre: textoObligatorio(datos.nombre, 'Nombre', 120),
    formaDeTenencia: datos.formaDeTenencia,
    ...puntoValido(datos.latitud, datos.longitud),
    colindanciaNorte: colindancia(datos.colindanciaNorte, 'norte'),
    colindanciaSur: colindancia(datos.colindanciaSur, 'sur'),
    colindanciaOriente: colindancia(datos.colindanciaOriente, 'oriente'),
    colindanciaPoniente: colindancia(datos.colindanciaPoniente, 'poniente'),
    observaciones: textoOpcional(datos.observaciones, 'Observaciones', 500),
  };
}

/** El nivel que le toca bajo su madre, revisando que la madre sirva y que no pase del tope. */
function nivelBajo({ localidadId, madre, nivelesMaximos }: UbicacionDeParcela): number {
  if (madre === null) return 1;
  const propiedades = madre.instantanea();
  if (!propiedades.activo) throw new MadreInactiva();
  if (propiedades.localidadId !== localidadId) throw new ParcelaDeOtraLocalidad();
  if (propiedades.nivel + 1 > nivelesMaximos) throw new NivelMaximoDeParcelas(nivelesMaximos);
  return propiedades.nivel + 1;
}

/** Parcela de una localidad (potrero, lote, tablón…), con madre opcional. Sus reglas van aquí, en el dominio. */
export class Parcela extends Entidad<ParcelaId> {
  private constructor(private propiedades: PropiedadesDeParcela) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeParcela, ubicacion: UbicacionDeParcela): Parcela {
    const nivel = nivelBajo(ubicacion);
    return new Parcela({
      ...datosEditablesValidos(datos),
      codigo: codigoValido(datos.codigo),
      id: Identificador.nuevo(),
      empresaId,
      localidadId: ubicacion.localidadId,
      parcelaMadreId: ubicacion.madre?.id.valor ?? null,
      nivel,
      superficieTotalM2: null,
      superficieUtilM2: null,
      activo: true,
    });
  }

  static reconstruir(propiedades: PropiedadesDeParcela): Parcela {
    return new Parcela(propiedades);
  }

  /** Cambia lo editable; el código, la localidad y la madre no se cambian (PA-12): para reorganizar se crea otra. */
  cambiarDatos(datos: DatosEditablesDeParcela): void {
    this.propiedades = { ...this.propiedades, ...datosEditablesValidos(datos) };
  }

  /** Copia la medición vigente (o la quita con `null`); la útil nunca pasa de la total. */
  fijarSuperficie(superficie: { total: string; util: string } | null): void {
    if (superficie && textoACentesimas(superficie.util) > textoACentesimas(superficie.total)) {
      throw new SuperficieUtilMayorQueTotal();
    }
    this.propiedades = {
      ...this.propiedades,
      superficieTotalM2: superficie?.total ?? null,
      superficieUtilM2: superficie?.util ?? null,
    };
  }

  inactivar(): void {
    this.propiedades = { ...this.propiedades, activo: false };
  }

  reactivar(): void {
    this.propiedades = { ...this.propiedades, activo: true };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeParcela> {
    return { ...this.propiedades };
  }
}
