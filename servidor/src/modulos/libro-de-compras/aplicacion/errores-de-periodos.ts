import { RecursoEnUso } from '../../core/compartido/aplicacion/errores.js';

const mes = (periodo: string): string => periodo.slice(0, 7);

/** Lo que el cliente necesita para ofrecer «Registrar en <mes>». */
export interface PropuestaDeRegistro {
  /** El primer período abierto, o `null` si no hay alternativa (la nota de crédito). */
  periodo: string | null;
  /** El período propuesto todavía da crédito (art. 20). */
  enPlazo: boolean;
}

/**
 * El período está declarado y la empresa tiene el bloqueo encendido: no se registra, anula ni elimina en él.
 * `detalles.periodoPropuesto` trae el primer período abierto (o `null`).
 */
export class PeriodoDeclarado extends RecursoEnUso {
  override readonly codigo = 'periodo_declarado';

  constructor(periodo: string, propuesta: PropuestaDeRegistro | null = null) {
    super(`El período ${mes(periodo)} está declarado y bloqueado: reábralo para cambiar sus documentos.`, {
      campo: 'periodo',
      periodo,
      periodoPropuesto: propuesta?.periodo ?? null,
      propuestaEnPlazo: propuesta?.enPlazo ?? null,
    });
  }
}

/**
 * Una vigencia fiscal de la empresa cubre un período declarado y bloqueado: cambiarla o quitarla cambiaría el tipo
 * de libro de un mes ya declarado, aunque no tenga documentos.
 */
export class VigenciaFiscalEnPeriodoDeclarado extends RecursoEnUso {
  override readonly codigo = 'vigencia_fiscal_en_periodo_declarado';

  constructor(periodo: string) {
    super(`El período ${mes(periodo)} está declarado y bloqueado: reábralo para cambiar el régimen que lo cubre.`, {
      campo: 'secciones.libro-de-compras.vigenteDesde',
      periodo,
    });
  }
}
