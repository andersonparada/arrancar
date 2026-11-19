/**
 * Eventos de `activos-fijos` (ver `docs/modulos/diseno-activos-fijos.md` §9), de después de confirmar, para la futura
 * Contabilidad y quien quiera escucharlos. El dinero va en centavos enteros (quetzales). Todos llevan la clase, el inciso
 * fiscal, la ubicación del activo y el período (primer día del mes `aaaa-mm-01`).
 */
declare module '../eventos/bus-eventos.js' {
  interface EventosDominio {
    /** Se guardaron costos de un activo (alta o suma a uno existente, también en construcción). */
    'activos-fijos.activo_capitalizado': {
      empresaId: string;
      activoId: string;
      claseId: string;
      incisoFiscal: string;
      localidadId: string | null;
      departamentoId: string | null;
      fecha: string;
      periodo: string;
      /** El id de la compra conjunta si el activo se creó junto con otros. */
      altaConjuntaId: string | null;
      costos: {
        costoId: string;
        origen: 'linea_de_compra' | 'manual' | 'saldo_inicial';
        claseDeCosto: string;
        documentoDeCompraId: string | null;
        lineaDeDocumentoId: string | null;
        montoCentavos: number;
        aplicaAlLibroFiscal: boolean;
        noEsEdificacion: boolean;
      }[];
    };
    /** Se anuló un costo de un activo. */
    'activos-fijos.costo_anulado': {
      empresaId: string;
      activoId: string;
      claseId: string;
      incisoFiscal: string;
      localidadId: string | null;
      departamentoId: string | null;
      fecha: string;
      periodo: string;
      costoId: string;
      montoCentavos: number;
    };
    /** Se registró una mejora o un costo posterior en un activo en uso (los exceso son de una nota de crédito, V-6). */
    'activos-fijos.mejora_capitalizada': {
      empresaId: string;
      activoId: string;
      claseId: string;
      incisoFiscal: string;
      localidadId: string | null;
      departamentoId: string | null;
      fecha: string;
      periodo: string;
      mejoraId: string;
      clase: 'mejora' | 'costo_posterior';
      montoCentavos: number;
      vidaUtilRestanteContableMeses: number | null;
      excesoContableCentavos: number;
      excesoFiscalCentavos: number;
    };
    /** Cambió la matrícula o el catastro de un edificio: la base fiscal se recalcula hacia adelante. */
    'activos-fijos.base_fiscal_cambiada': {
      empresaId: string;
      activoId: string;
      claseId: string;
      incisoFiscal: string;
      localidadId: string | null;
      departamentoId: string | null;
      fecha: string;
      periodo: string;
      valorDeMatriculaAnterior: string | null;
      valorCatastralAnterior: string | null;
      valorDeMatricula: string | null;
      valorCatastral: string | null;
      baseFiscalCentavos: number;
    };
    /** Se cerró un mes de depreciación: las cuotas de cada activo y libro (el dinero en centavos). */
    'activos-fijos.depreciacion_cerrada': {
      empresaId: string;
      periodo: string;
      cuotas: {
        activoId: string;
        claseId: string;
        incisoFiscal: string;
        libro: 'contable' | 'fiscal';
        montoCentavos: number;
        localidadId: string | null;
        departamentoId: string | null;
        ocioso: boolean;
      }[];
      totalContableCentavos: number;
      totalFiscalCentavos: number;
      regimenIsr: string | null;
    };
    /** Se reabrió un mes: quien contabilizó sus cuotas debe revertirlas. */
    'activos-fijos.depreciacion_reabierta': {
      empresaId: string;
      periodo: string;
      totalContableCentavos: number;
      totalFiscalCentavos: number;
    };
  }
}

export {};
