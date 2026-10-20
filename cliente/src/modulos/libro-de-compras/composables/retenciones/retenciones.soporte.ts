import type { GrupoDelMes, PagoDeEntero, RetencionDelMes } from '../../servicios/retenciones.api';

/** Una retención de prueba; lo que se pase pisa lo de omisión. */
export function retencion(cambios: Partial<RetencionDelMes> = {}): RetencionDelMes {
  return {
    id: 'r1',
    impuesto: 'iva',
    regla: 'iva_otro_agente',
    grupo: 'iva_agentes',
    fecha: '2026-09-10',
    base: '1000.00',
    porcentaje: '5.00',
    propuesto: '50.00',
    retenido: '50.00',
    enCero: false,
    motivoDelAjuste: null,
    constanciaNumero: null,
    constanciaFecha: null,
    documento: {
      id: 'd1',
      estado: 'vigente',
      tipoDte: 'FPEQ',
      serie: 'A',
      numero: '123',
      uuid: null,
      fechaEmision: '2026-09-10',
    },
    proveedor: { id: 'p1', nit: '1234567', nombre: 'Ferretería La Paz' },
    ...cambios,
  };
}

export function pago(cambios: Partial<PagoDeEntero> = {}): PagoDeEntero {
  return {
    id: 'e1',
    mes: '2026-09-01',
    grupo: 'iva_agentes',
    fechaDePago: '2026-10-15',
    documentoDePago: 'B-100',
    monto: '30.00',
    retenidoAlMarcar: '50.00',
    observaciones: null,
    estado: 'vigente',
    anuladoEn: null,
    motivoDeAnulacion: null,
    registradoPor: null,
    ...cambios,
  };
}

export function grupo(cambios: Partial<GrupoDelMes> = {}): GrupoDelMes {
  return {
    grupo: 'iva_agentes',
    nombre: 'IVA de agentes',
    mes: '2026-09-01',
    plazo: '2026-10-20',
    retenido: '50.00',
    pagado: '30.00',
    diferencia: '20.00',
    estado: 'con_diferencia',
    aviso: null,
    conConstancia: { cantidad: 0, monto: '0.00' },
    sinConstancia: { cantidad: 1, monto: '50.00' },
    pagos: [pago()],
    ...cambios,
  };
}
