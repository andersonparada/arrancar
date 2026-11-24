/** Cómo tiene la empresa la parcela (`docs/modulos/diseno-parcelas.md` §3.4). */
export const FORMAS_DE_TENENCIA = [
  'propia',
  'posesion',
  'copropiedad',
  'arrendada',
  'usufructo',
  'comodato',
  'aparceria',
  'otra',
] as const;
export type FormaDeTenencia = (typeof FORMAS_DE_TENENCIA)[number];

/** Lo que cambia el usuario de una parcela ya creada: la localidad, la madre y el código no se cambian. */
export interface DatosEditablesDeParcela {
  tipoId: string;
  nombre: string;
  formaDeTenencia: FormaDeTenencia;
  latitud: string | null;
  longitud: string | null;
  colindanciaNorte: string | null;
  colindanciaSur: string | null;
  colindanciaOriente: string | null;
  colindanciaPoniente: string | null;
  observaciones: string | null;
}

/** Los datos de una parcela nueva: lo editable, más su código. */
export interface DatosDeParcela extends DatosEditablesDeParcela {
  codigo: string;
}
