import { Entidad } from '../../core/compartido/dominio/entidad.js';
import { Identificador } from '../../core/compartido/dominio/identificador.js';
import type { DatosDeInmueble } from './datos-de-inmueble.js';
import { InmuebleInvalido } from './errores-de-inmueble.js';
import {
  textoOpcional,
  validarElRegistro,
  validarLaCifraOriginal,
  validarLaTitularidad,
  validarLaUbicacion,
} from './reglas-de-inmueble.js';

export type InmuebleId = Identificador<'Inmueble'>;
export type { DatosDeInmueble } from './datos-de-inmueble.js';
export { InmuebleInvalido, InmuebleRegistroIncompleto } from './errores-de-inmueble.js';

export interface PropiedadesDeInmueble extends DatosDeInmueble {
  id: InmuebleId;
  empresaId: Identificador<'Empresa'>;
  activo: boolean;
}

/** Recorta los textos y revisa las reglas del registro, la titularidad, la ubicación y la escritura. */
function datosValidos(datos: DatosDeInmueble): DatosDeInmueble {
  const nombre = datos.nombre.trim();
  if (!nombre || nombre.length > 120)
    throw new InmuebleInvalido('Escriba el nombre del inmueble (hasta 120 caracteres).');
  const limpios: DatosDeInmueble = {
    ...datos,
    nombre,
    numeroDeFinca: textoOpcional(datos.numeroDeFinca, 'Número de finca', 20),
    folio: textoOpcional(datos.folio, 'Folio', 20),
    libro: textoOpcional(datos.libro, 'Libro', 20),
    documentoPosesorio: textoOpcional(datos.documentoPosesorio, 'Documento de derechos posesorios', 300),
    titular: textoOpcional(datos.titular, 'Titular registral', 150),
    matriculaFiscal: textoOpcional(datos.matriculaFiscal, 'Matrícula fiscal', 30),
    codigoCatastral: textoOpcional(datos.codigoCatastral, 'Código catastral', 40),
    direccion: textoOpcional(datos.direccion, 'Dirección', 300),
    observaciones: textoOpcional(datos.observaciones, 'Observaciones', 500),
  };
  validarElRegistro(limpios);
  validarLaTitularidad(limpios);
  validarLaUbicacion(limpios);
  validarLaCifraOriginal(limpios);
  return limpios;
}

/** Inmueble registral de la empresa. Sus reglas van aquí, en el dominio. */
export class Inmueble extends Entidad<InmuebleId> {
  private constructor(private propiedades: PropiedadesDeInmueble) {
    super(propiedades.id);
  }

  static crear(empresaId: Identificador<'Empresa'>, datos: DatosDeInmueble): Inmueble {
    return new Inmueble({ ...datosValidos(datos), empresaId, id: Identificador.nuevo(), activo: true });
  }

  static reconstruir(propiedades: PropiedadesDeInmueble): Inmueble {
    return new Inmueble(propiedades);
  }

  cambiarDatos(datos: DatosDeInmueble): void {
    this.propiedades = { ...this.propiedades, ...datosValidos(datos) };
  }

  inactivar(): void {
    this.propiedades = { ...this.propiedades, activo: false };
  }

  reactivar(): void {
    this.propiedades = { ...this.propiedades, activo: true };
  }

  /** Copia de solo lectura de sus propiedades, para guardarla. */
  instantanea(): Readonly<PropiedadesDeInmueble> {
    return { ...this.propiedades };
  }
}
