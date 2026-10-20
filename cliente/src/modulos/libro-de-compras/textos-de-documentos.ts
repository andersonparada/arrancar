import type {
  CausaDeAnulacion,
  DestinoDeDocumento,
  MotivoFueraDelLibro,
  MotivoSinCredito,
  TipoDeDocumento,
} from './servicios/documentos.api';

/** Fecha en que quedó derogado el régimen de contribuyentes agropecuarios (Decreto 7-2019), `AAAA-MM-DD`. */
export const FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019 = '2025-07-09';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** El mes y el año de una fecha `AAAA-MM-DD`, en español: «julio de 2025». */
export function mesDeFecha(fecha: string): string {
  const [anio, mes] = fecha.split('-');
  return `${MESES[Number(mes) - 1]} de ${anio}`;
}

const MES_DE_DEROGACION = mesDeFecha(FECHA_DE_DEROGACION_REGIMENES_DECRETO_7_2019);

/** Textos de la pantalla «Ingreso de facturas» (lista, ficha y anulación). */
export const VENTANA_DE_DOCUMENTOS = {
  titulo: 'Ingreso de facturas',
  descripcion: 'Las facturas y las notas de crédito y de débito de las compras de la empresa.',
  registrar: 'Registrar factura',
  ficha: 'Factura',
} as const;

/** Las familias de documento: las de régimen derogado se marcan así para que el operador no las confunda con las vigentes. */
export const TIPOS_DE_DOCUMENTO: Record<TipoDeDocumento, string> = {
  factura: 'Factura',
  factura_pequeno_contribuyente: 'Factura de pequeño contribuyente',
  factura_pequeno_contribuyente_electronico: 'Factura de pequeño contribuyente electrónico (régimen derogado)',
  factura_contribuyente_agropecuario: 'Factura de contribuyente agropecuario (régimen derogado)',
  factura_primario_pecuario: 'Factura de productor primario o pecuario',
  factura_especial: 'Factura especial (emitida por la empresa)',
  nota_de_credito: 'Nota de crédito del proveedor',
  nota_de_debito: 'Nota de débito del proveedor',
  recibo: 'Recibo',
};

export const DESTINOS_DE_DOCUMENTO: Record<DestinoDeDocumento, string> = {
  'caja-chica': 'Caja chica',
  'cuentas-por-liquidar': 'Cuentas por liquidar',
  'cuentas-por-pagar': 'Cuentas por pagar',
};

export const CAUSAS_DE_ANULACION: Record<CausaDeAnulacion, string> = {
  error_de_captura: 'Error de captura',
  fel_anulada_por_el_emisor: 'El emisor anuló la FEL en la SAT',
  no_corresponde_a_la_empresa: 'No es una compra de esta empresa',
};

/** Por qué el IVA de un documento no es crédito fiscal y va al costo o gasto. */
export const MOTIVOS_SIN_CREDITO: Record<MotivoSinCredito, string> = {
  empresa_sin_credito:
    'Por el régimen de IVA de la empresa en este período, las compras no dan crédito fiscal. El IVA se suma al costo o gasto de lo comprado.',
  fuera_de_plazo:
    'Pasaron más de dos meses desde el mes en que se emitió la factura: ya no se puede tomar el IVA como crédito fiscal (Ley del IVA, art. 20). El IVA se suma al costo o gasto de lo comprado.',
  no_vinculado:
    'Esta compra no se usa en ventas gravadas con IVA (Ley del IVA, art. 16): su IVA no es crédito fiscal. Se suma al costo o gasto.',
  pequeno_contribuyente:
    'El proveedor está en el régimen de pequeño contribuyente: su factura no da crédito fiscal. El total se registra como costo o gasto.',
  exento: 'Todo lo comprado está exento de IVA (Ley del IVA, art. 7): no hay IVA que acreditar.',
  contribuyente_agropecuario: `Factura de un contribuyente agropecuario, régimen eliminado en ${MES_DE_DEROGACION} (Decreto 31-2024): no da crédito fiscal. El total se registra como costo o gasto.`,
  primario_pecuario:
    'Compra a un productor primario o pecuario (Decreto 31-2024): su factura no da crédito fiscal. El monto se registra como costo o gasto.',
  nota_de_debito_tardia:
    'La nota de débito se emitió más de dos meses después de su factura: no da crédito fiscal (Ley del IVA, art. 17). El IVA se suma al costo o gasto.',
};

/** El enlace a la factura que corrige la nota: la de débito la aumenta; la de crédito, la rebaja. */
export const textoDelEnlaceALaFactura = (tipo: TipoDeDocumento): string =>
  tipo === 'nota_de_debito' ? 'Ver la factura que aumenta esta nota' : 'Ver la factura que rebaja esta nota';

/** Por qué un documento no se muestra en los reportes de la SAT. */
export const MOTIVOS_FUERA_DEL_LIBRO: Record<MotivoFueraDelLibro, string> = {
  sin_fel:
    'Documento sin FEL (por ejemplo, recibo de un proveedor informal): la SAT no lo conoce, así que no se reporta ni da crédito fiscal.',
  fel_a_consumidor_final:
    'La FEL se emitió a consumidor final (CF) y no a nombre de la empresa: no se reporta a la SAT ni da crédito fiscal.',
  fel_a_otro_nit:
    'La FEL se emitió a nombre de otra persona (otro NIT o CUI), no de la empresa: no se reporta a la SAT ni da crédito fiscal.',
};

const ADVERTENCIA_DE_ISR = ' Puede no ser deducible del ISR.';

/** El texto de por qué un documento queda fuera del libro; agrega la advertencia del ISR si la empresa tiene ISR sobre utilidades. */
export function textoFueraDelLibro(motivo: MotivoFueraDelLibro, conIsrSobreUtilidades = false): string {
  const texto = MOTIVOS_FUERA_DEL_LIBRO[motivo];
  return conIsrSobreUtilidades ? `${texto}${ADVERTENCIA_DE_ISR}` : texto;
}

export const REGLAS_DE_RETENCION: Record<string, string> = {
  iva_exportador_agropecuario: 'Retención de IVA: la empresa es exportadora (bienes agropecuarios)',
  iva_exportador: 'Retención de IVA: la empresa es exportadora (otras compras)',
  iva_contribuyente_especial: 'Retención de IVA: la empresa es contribuyente especial',
  iva_otro_agente: 'Retención de IVA: la empresa fue calificada por la SAT como agente de retención',
  iva_sector_publico: 'Retención de IVA: la empresa pertenece al sector público',
  iva_pequeno_contribuyente: 'Retención de IVA del 5 %: el proveedor es pequeño contribuyente',
  isr_opcional_simplificado: 'Retención de ISR: el proveedor está en el régimen opcional simplificado sobre ingresos',
  iva_factura_especial: 'Retención del 100 % del IVA: factura especial',
  isr_factura_especial: 'Retención de ISR (pago único): factura especial',
};

/** La causa «anulada por el emisor» de una factura especial: la emite la propia empresa, no el proveedor. */
export const CAUSA_ANULADA_POR_LA_EMPRESA = 'FESP anulada por la empresa';

/** El nombre de una causa de anulación; en la factura especial el emisor es la empresa. */
export function textoDeCausa(causa: CausaDeAnulacion, tipo: TipoDeDocumento): string {
  return causa === 'fel_anulada_por_el_emisor' && tipo === 'factura_especial'
    ? CAUSA_ANULADA_POR_LA_EMPRESA
    : CAUSAS_DE_ANULACION[causa];
}

export const AYUDA_DE_ANULAR =
  'Esto anula únicamente el registro en Arrancar, no la factura en la SAT. Solo su emisor puede anularla allá, y solo hasta el vencimiento de la declaración del IVA del mes de la factura. Si hubo una devolución o un descuento, use una nota de crédito.';
