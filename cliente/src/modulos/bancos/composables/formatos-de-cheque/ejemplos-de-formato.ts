import type { FormatoDeCheque, PlantillaDeCheque } from '../../servicios/tipos-de-formatos-de-cheque';

/** Un formato de cheque suelto (aproximado) para las pruebas. */
export const formatoDeEjemplo = (): FormatoDeCheque => ({
  papel: { anchoMm: 175, altoMm: 76 },
  desplazamiento: { xMm: 0, yMm: 0 },
  letra: { familia: 'monoespaciada', tamanoPt: 10 },
  fecha: { modo: 'texto', lugarYFecha: { xMm: 95, yMm: 12, anchoMm: 75, visible: true, alineacion: 'derecha' } },
  beneficiario: { xMm: 25, yMm: 24, anchoMm: 105, visible: true },
  montoEnNumeros: { xMm: 135, yMm: 24, anchoMm: 35, visible: true },
  montoEnLetras: {
    xMm: 25,
    yMm: 33,
    anchoMm: 145,
    visible: true,
    segundaLinea: { xMm: 25, yMm: 40, anchoMm: 145 },
  },
  noNegociable: { xMm: 25, yMm: 52, anchoMm: 45, visible: true, preimpreso: false },
  paraAbonoEnCuenta: { xMm: 90, yMm: 52, anchoMm: 60, visible: true, preimpreso: false },
  talonFecha: null,
  talonBeneficiario: null,
  talonMonto: null,
  talonConcepto: null,
  comprobante: null,
});

export const plantillasDeEjemplo = (): PlantillaDeCheque[] => [
  { clave: 'cheque_suelto', nombre: 'Cheque suelto', descripcion: 'Medidas aproximadas.', formato: formatoDeEjemplo() },
  {
    clave: 'voucher_carta_arriba',
    nombre: 'Voucher en carta',
    descripcion: 'Medidas aproximadas.',
    formato: {
      ...formatoDeEjemplo(),
      papel: { anchoMm: 215.9, altoMm: 279.4 },
      comprobante: { yMm: 100, altoMm: 170 },
    },
  },
];
