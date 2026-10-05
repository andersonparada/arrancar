import { porcentajeDe } from './aritmetica-fiscal.js';
import type { AgenteDeRetencionDeIva } from './datos-fiscales-de-empresa.js';
import {
  esLineaAgropecuaria,
  type ConfiguracionDeRetenciones,
  type EntradaDeRetenciones,
  type EstrategiaDeRetencion,
  type ReglaDeRetencion,
  type RetencionPropuesta,
} from './retencion-propuesta.js';

/** Una propuesta de IVA con fecha de recepción; ninguna si no hay base. */
function propuestaDeIva(regla: ReglaDeRetencion, base: number, porcentaje: number): RetencionPropuesta[] {
  if (base <= 0) return [];
  const montoPropuesto = porcentajeDe(base, porcentaje);
  return [{ impuesto: 'iva', regla, base, porcentaje, montoPropuesto, origenDeLaFecha: 'recepcion' }];
}

/**
 * Factura de un proveedor al que se le retiene el IVA general y que no es agente (entre agentes no
 * se retiene, Decreto 20-2006 art. 9). No mira el motivo sin crédito fiscal.
 */
function esSujetoDeIva(entrada: EntradaDeRetenciones): boolean {
  const proveedor = entrada.proveedor.instantanea();
  return entrada.tipo === 'factura' && proveedor.seLeRetieneIva && !proveedor.esAgenteDeRetencionIva;
}

function esAgente(entrada: EntradaDeRetenciones, agente: AgenteDeRetencionDeIva): boolean {
  return entrada.empresa.instantanea().agenteDeRetencionIva === agente;
}

/** IVA de las líneas agropecuarias (concepto agropecuario y tipo bien) o de las demás del documento. */
function ivaDeLasLineas(entrada: EntradaDeRetenciones, agropecuarias: boolean): number {
  return entrada.documento.lineas.reduce((suma, linea, indice) => {
    const datos = entrada.datosDeLineas[indice];
    const esAgropecuaria = datos !== undefined && esLineaAgropecuaria(datos);
    return esAgropecuaria === agropecuarias ? suma + linea.iva : suma;
  }, 0);
}

/** Exportador: 65 % del IVA de lo agropecuario y 15 % del de lo demás, con el mínimo sobre el total. */
export class EstrategiaDeExportador implements EstrategiaDeRetencion {
  proponer(entrada: EntradaDeRetenciones): RetencionPropuesta[] {
    const config = entrada.configuracion;
    const aplica =
      esAgente(entrada, 'exportador') && esSujetoDeIva(entrada) && entrada.documento.totales.total >= config.minimoIva;
    if (!aplica) return [];
    const agropecuario = ivaDeLasLineas(entrada, true);
    return [
      ...propuestaDeIva('iva_exportador_agropecuario', agropecuario, config.porcentajeExportadorAgropecuario),
      ...propuestaDeIva('iva_exportador', ivaDeLasLineas(entrada, false), config.porcentajeExportador),
    ];
  }
}

type Porcentaje = (configuracion: ConfiguracionDeRetenciones) => number;

/** Contribuyente especial y agente «otro»: su porcentaje del IVA del documento, con el mismo mínimo. */
export class EstrategiaDeAgenteGeneral implements EstrategiaDeRetencion {
  constructor(
    private readonly agente: AgenteDeRetencionDeIva,
    private readonly regla: ReglaDeRetencion,
    private readonly porcentaje: Porcentaje,
  ) {}

  proponer(entrada: EntradaDeRetenciones): RetencionPropuesta[] {
    const aplica =
      esAgente(entrada, this.agente) &&
      esSujetoDeIva(entrada) &&
      entrada.documento.totales.total >= entrada.configuracion.minimoIva;
    if (!aplica) return [];
    return propuestaDeIva(this.regla, entrada.documento.totales.iva, this.porcentaje(entrada.configuracion));
  }
}

/** Sector público: 25 % del IVA si el total llega al mínimo propio (Q30,000.00 por omisión). */
export class EstrategiaDeSectorPublico implements EstrategiaDeRetencion {
  proponer(entrada: EntradaDeRetenciones): RetencionPropuesta[] {
    const config = entrada.configuracion;
    const { total, iva } = entrada.documento.totales;
    const aplica = esAgente(entrada, 'sector_publico') && esSujetoDeIva(entrada) && total >= config.minimoSectorPublico;
    if (!aplica) return [];
    return propuestaDeIva('iva_sector_publico', iva, config.porcentajeSectorPublico);
  }
}

/**
 * 5 % del total de la factura de pequeño contribuyente, solo si es **mayor** que el umbral (AG 5-2013 art. 49)
 * y la empresa es agente de retención del IVA. La fecha la pone el destino.
 */
export class EstrategiaDePequenoContribuyente implements EstrategiaDeRetencion {
  proponer(entrada: EntradaDeRetenciones): RetencionPropuesta[] {
    const config = entrada.configuracion;
    const base = entrada.documento.totales.total;
    const aplica =
      entrada.tipo === 'factura_pequeno_contribuyente' &&
      !esAgente(entrada, 'ninguno') &&
      entrada.proveedor.instantanea().seLeRetieneIvaPequenoContribuyente &&
      base > config.umbralPequenoContribuyente;
    if (!aplica) return [];
    const porcentaje = config.porcentajePequenoContribuyente;
    const montoPropuesto = porcentajeDe(base, porcentaje);
    return [
      {
        impuesto: 'iva',
        regla: 'iva_pequeno_contribuyente',
        base,
        porcentaje,
        montoPropuesto,
        origenDeLaFecha: 'destino',
      },
    ];
  }
}
