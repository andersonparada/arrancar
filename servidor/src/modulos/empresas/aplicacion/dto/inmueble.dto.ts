/** Inmueble tal como lo ve el usuario en pantalla. */
export interface InmuebleDto {
  id: string;
  nombre: string;
  situacionRegistral: 'inscrito' | 'posesorio';
  registro: 'general' | 'segundo' | null;
  numeroDeFinca: string | null;
  folio: string | null;
  libro: string | null;
  departamentoRegistral: string | null;
  documentoPosesorio: string | null;
  titulacionSupletoriaEnTramite: boolean;
  titularidad: 'propia' | 'copropiedad' | 'de_tercero';
  porcentajeDeCopropiedad: string | null;
  titular: string | null;
  matriculaFiscal: string | null;
  administraIusi: 'dicabi' | 'municipalidad' | null;
  codigoCatastral: string | null;
  departamentoCodigo: string | null;
  municipioCodigo: string | null;
  direccion: string | null;
  superficieRegistralM2: string | null;
  cantidadOriginal: string | null;
  unidadOriginal: 'm2' | 'hectarea' | 'manzana' | 'cuerda' | 'vara_cuadrada' | 'caballeria' | null;
  varasPorLadoDeCuerda: number | null;
  localidadId: string | null;
  observaciones: string | null;
  activo: boolean;
  localidadNombre: string | null;
}

/** Lo que se recibe para registrar o cambiar un inmueble, ya validado en su forma. */
export type SolicitudDeInmueble = Omit<InmuebleDto, 'id' | 'localidadNombre' | 'activo'>;
