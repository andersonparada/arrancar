import type { AvisoDeBaja, DatosParaLosAvisos } from './avisos-de-baja.js';

const aviso = (codigo: string, mensaje: string): AvisoDeBaja => ({ codigo, mensaje });

const esPequenoContribuyente = (regimenDeIva: string | null) =>
  regimenDeIva?.startsWith('pequeno_contribuyente') ?? false;

const COBRO = 'El cobro se registra en Bancos con el concepto «Venta de activo».';

/** El IVA de vender un bien que se llevó a gasto: la venta es hecho generador aunque el bien no esté en libros. */
function avisoDelIva(regimenDeIva: string | null): AvisoDeBaja {
  if (regimenDeIva === 'general')
    return aviso(
      'venta_con_iva',
      `La venta genera débito de IVA del 12 % aunque el bien se haya llevado a gasto (Ley del IVA, arts. 3, num. 1, y 10). Emita la FEL y regístrela en el libro de ventas. ${COBRO}`,
    );
  if (esPequenoContribuyente(regimenDeIva))
    return aviso(
      'venta_con_iva',
      `Emita factura de pequeño contribuyente: no lleva IVA desglosado. El 5 % se paga sobre el total (Ley del IVA, art. 47) y este ingreso cuenta para el límite anual del régimen. ${COBRO}`,
    );
  return aviso(
    'venta_con_iva',
    `Revise el IVA que corresponde a esta venta y que esté respaldada por su factura. ${COBRO}`,
  );
}

const CONFIRMAR = 'Confírmelo con el contador de la empresa.';

function avisoDelIsr({ regimenDeIva, regimenDeIsr }: DatosParaLosAvisos): AvisoDeBaja {
  if (esPequenoContribuyente(regimenDeIva))
    return aviso(
      'isr_de_venta_de_control',
      `Su 5 % sustituye el ISR de la actividad, pero una ganancia de capital (precio mayor que el costo) podría tributar el 10 % aparte. ${CONFIRMAR}`,
    );
  const comun =
    'Si vender estos bienes no es su giro, es ganancia de capital: 10 %, se declara y paga dentro de los primeros 10 días del mes siguiente (ISR, arts. 84, num. 3, 92 y 95).';
  if (regimenDeIsr === 'utilidades')
    return aviso(
      'isr_de_venta_de_control',
      `El resultado fiscal es el precio (el costo se dedujo como gasto). ${comun} Como el costo se dedujo al 25 %, la SAT podría tratarlo como renta de la actividad. ${CONFIRMAR}`,
    );
  if (regimenDeIsr === 'opcional_simplificado')
    return aviso(
      'isr_de_venta_de_control',
      `${comun} Si el comprador es agente de retención y le retiene sobre la factura, consulte con su contador para no pagar dos veces. ${CONFIRMAR}`,
    );
  return aviso('isr_de_venta_de_control', `Revise el ISR que corresponde a esta venta. ${CONFIRMAR}`);
}

function avisoDelOrigen({ origenDelCostoFiscal }: DatosParaLosAvisos): AvisoDeBaja | null {
  if (origenDelCostoFiscal === 'criterio_del_contador')
    return aviso(
      'costo_sostenido_por_el_contador',
      'Costo sostenido por criterio del contador: va contra la letra del art. 89, inciso a, del ISR si la empresa lleva contabilidad completa. Queda el motivo en la baja.',
    );
  if (origenDelCostoFiscal === 'sin_documento')
    return aviso(
      'costo_fiscal_sin_documento',
      'Sin el documento de compra del bien, el costo fiscal es cero: no hay costo que oponer a la SAT. Si lo tiene, registre el costo de referencia con su documento.',
    );
  return null;
}

/** Ganancia o pérdida de capital según el resultado fiscal; una pérdida no se deduce (ISR, arts. 91 y 96). */
function avisoDelResultado(resultadoFiscalCentavos: number): AvisoDeBaja | null {
  if (resultadoFiscalCentavos > 0) return null;
  return aviso(
    'perdida_de_capital',
    'La pérdida de capital no es deducible: solo se compensa con ganancias de capital futuras (ISR, arts. 91 y 96).',
  );
}

/**
 * Los avisos de vender un bien de control (AF-9b): el IVA y el ISR según el régimen, el origen del costo fiscal y la
 * pérdida de capital. El resultado contable es todo el precio sin IVA, en otros ingresos.
 */
export function avisosDeVentaDeControl(datos: DatosParaLosAvisos): AvisoDeBaja[] {
  const avisos = [avisoDelIva(datos.regimenDeIva), avisoDelIsr(datos)];
  const origen = avisoDelOrigen(datos);
  if (origen) avisos.push(origen);
  const perdida = datos.resultadoFiscalCentavos === null ? null : avisoDelResultado(datos.resultadoFiscalCentavos);
  if (perdida) avisos.push(perdida);
  return avisos;
}
