import { AccesoDenegado, RecursoDuplicado, RecursoEnUso } from '../../core/compartido/aplicacion/errores.js';

/**
 * El documento ya está registrado en la empresa activa. Trae su id en `detalles.documentoId` para que la pantalla
 * ofrezca abrirlo; si el repetido está en otra empresa o cuenta, la base rechaza con un mensaje que no dice dónde.
 */
export class DocumentoRepetido extends RecursoDuplicado {
  override readonly codigo = 'documento_repetido';

  constructor(documentoId: string) {
    super('Ese documento ya está registrado en esta empresa.', { documentoId });
  }
}

/**
 * Una vigencia fiscal de la empresa la usan documentos vigentes: cambiarla o quitarla les cambiaría el régimen.
 * `detalles.periodo` es el primer período con documentos afectados.
 */
export class VigenciaFiscalEnUso extends RecursoEnUso {
  override readonly codigo = 'vigencia_fiscal_en_uso';

  constructor(periodo: string) {
    super(
      `Hay documentos registrados en ${periodo.slice(0, 7)} con el régimen anterior: escoja un mes posterior o anúlelos.`,
      { campo: 'secciones.libro-de-compras.vigenteDesde', periodo },
    );
  }
}

/**
 * Quien confirma no puede crear proveedores y el del DTE no existe como tal. `crear`: el NIT es nuevo; `agregar_papel`:
 * ya está en Terceros (p. ej. como cliente) y solo falta darle el papel de proveedor.
 */
export class ProveedorNuevoSinPermiso extends AccesoDenegado {
  override readonly codigo = 'proveedor_nuevo_sin_permiso';

  constructor(nit: string, accion: 'crear' | 'agregar_papel' = 'crear') {
    super(accion === 'crear' ? MENSAJE_DE_NIT_NUEVO(nit) : MENSAJE_DE_NIT_EXISTENTE(nit), { nit, accion });
  }
}

const MENSAJE_DE_NIT_NUEVO = (nit: string) =>
  `El proveedor de este DTE (NIT ${nit}) aún no existe y usted no puede crear proveedores. Pida que lo creen en Proveedores; la fila lo tomará sola.`;

const MENSAJE_DE_NIT_EXISTENTE = (nit: string) =>
  `El NIT ${nit} ya está en Terceros, pero todavía no es proveedor, y usted no puede crear proveedores. Pida que le den el papel de proveedor en Proveedores; la fila lo tomará sola.`;
