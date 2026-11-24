/**
 * Eventos de las divisiones de `activos-fijos` (ver `docs/modulos/diseno-activos-fijos.md` §9 y §6.11), de después de
 * confirmar. Llevan la clase, el inciso fiscal, la ubicación y el período del activo de origen; el dinero va en centavos
 * enteros (quetzales). Contabilidad no necesita partida: el activo nuevo conserva la clase y la cuenta.
 */
declare module '../eventos/bus-eventos.js' {
  interface EventosDominio {
    /** Se dividió un activo con cantidad: salió otro con `cantidadSeparada` unidades y su parte (sin partida: misma clase y cuenta). */
    'activos-fijos.activo_dividido': {
      empresaId: string;
      activoId: string;
      claseId: string;
      incisoFiscal: string;
      localidadId: string | null;
      departamentoId: string | null;
      fecha: string;
      periodo: string;
      divisionId: string;
      activoOrigenId: string;
      activoNuevoId: string;
      cantidadSeparada: number;
      costoCentavos: number;
      costoFiscalCentavos: number;
      acumuladaContableCentavos: number;
      acumuladaFiscalCentavos: number;
      causa: 'manual' | 'traslado' | 'baja' | 'inventario' | 'separar_en_unidades';
    };
    /** Se anuló una división: el activo nuevo se borró y el origen recuperó su cantidad. */
    'activos-fijos.division_anulada': {
      empresaId: string;
      activoId: string;
      claseId: string;
      incisoFiscal: string;
      localidadId: string | null;
      departamentoId: string | null;
      fecha: string;
      periodo: string;
      divisionId: string;
    };
  }
}

export {};
