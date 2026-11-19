/** Respuestas del servicio del Banguat, con la forma que tiene el servicio real (grabadas a mano; las pruebas nunca lo llaman). */

const ENCABEZADO =
  '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ' +
  'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"><soap:Body>';
const PIE = '</soap:Body></soap:Envelope>';
const NS = 'xmlns="http://www.banguat.gob.gt/variables/ws/"';

/** Respuesta de `TipoCambioDia` con el dólar. */
export function respuestaDelDia(fecha: string, referencia: string): string {
  return (
    `${ENCABEZADO}<TipoCambioDiaResponse ${NS}><TipoCambioDiaResult><CambioDolar><VarDolar>` +
    `<fecha>${fecha}</fecha><referencia>${referencia}</referencia></VarDolar></CambioDolar>` +
    `<TotalItems>1</TotalItems></TipoCambioDiaResult></TipoCambioDiaResponse>${PIE}`
  );
}

/** Una fila `Var` de `TipoCambioRango`. */
export function filaDelRango(fila: { moneda?: string; fecha: string; venta: string; compra?: string }): string {
  return (
    `<Var><moneda>${fila.moneda ?? '2'}</moneda><fecha>${fila.fecha}</fecha><venta>${fila.venta}</venta>` +
    `<compra>${fila.compra ?? fila.venta}</compra></Var>`
  );
}

/** Respuesta de `TipoCambioRango` (o de otra operación de rango) con las filas dadas (sin filas: `<Vars />`, como responde el servicio). */
export function respuestaDelRango(filas: readonly string[], operacion = 'TipoCambioRango'): string {
  const vars = filas.length > 0 ? `<Vars>${filas.join('')}</Vars>` : '<Vars />';
  return (
    `${ENCABEZADO}<${operacion}Response ${NS}><${operacion}Result>${vars}` +
    `<TotalItems>${filas.length}</TotalItems></${operacion}Result></${operacion}Response>${PIE}`
  );
}

/** Respuesta de `TipoCambioRangoMoneda` con las filas dadas. */
export function respuestaDelRangoDeMoneda(filas: readonly string[]): string {
  return respuestaDelRango(filas, 'TipoCambioRangoMoneda');
}

/** Respuesta de `VariablesDisponibles` con las monedas dadas (código del Banguat y descripción tal como llega). */
export function respuestaDeLasVariables(monedas: readonly { moneda: string; descripcion: string }[]): string {
  const filas = monedas.map(
    (m) => `<Variable><moneda>${m.moneda}</moneda><descripcion>${m.descripcion}</descripcion></Variable>`,
  );
  const variables = filas.length > 0 ? `<Variables>${filas.join('')}</Variables>` : '<Variables />';
  return (
    `${ENCABEZADO}<VariablesDisponiblesResponse ${NS}><VariablesDisponiblesResult>${variables}` +
    `<TotalItems>${filas.length}</TotalItems></VariablesDisponiblesResult></VariablesDisponiblesResponse>${PIE}`
  );
}

/** Lista de monedas con forma del servicio real (códigos y descripciones de la comprobación C-1, más lo inválido). */
export const LISTA_DE_MONEDAS = respuestaDeLasVariables([
  { moneda: '2', descripcion: 'Dólares de EE.UU.' },
  { moneda: '24', descripcion: '  Euro ' },
  { moneda: '3', descripcion: 'Yenes &amp; otras' },
  { moneda: '2', descripcion: 'Repetida' },
  { moneda: 'x', descripcion: 'Código inválido' },
  { moneda: '30', descripcion: '' },
]);

/**
 * Rango del euro (24) del 16 al 23 de octubre de 2026, como lo publicó el Banguat (dólares por euro): sin filas el
 * sábado ni el domingo, con fila el martes 20 (asueto de Guatemala) y con un código que no se pidió (el 99).
 */
export const RANGO_DEL_EUR = respuestaDelRangoDeMoneda([
  filaDelRango({ moneda: '24', fecha: '16/10/2026', venta: '1.1257', compra: '1.1256' }),
  filaDelRango({ moneda: '24', fecha: '19/10/2026', venta: '1.1215', compra: '1.1214' }),
  filaDelRango({ moneda: '24', fecha: '20/10/2026', venta: '1.1238', compra: '1.1237' }),
  filaDelRango({ moneda: '24', fecha: '21/10/2026', venta: '1.1228', compra: '1.1227' }),
  filaDelRango({ moneda: '24', fecha: '22/10/2026', venta: '1.1195' }),
  filaDelRango({ moneda: '24', fecha: '23/10/2026', venta: '1.12' }),
  filaDelRango({ moneda: '99', fecha: '23/10/2026', venta: '1.5' }),
]);

/** Rango del CRC (16) con compra distinta de venta (18/11/2026, diferencial de 0.96 %) y la notación científica de una moneda barata. */
export const RANGO_DEL_CRC = respuestaDelRangoDeMoneda([
  filaDelRango({ moneda: '16', fecha: '17/11/2026', venta: '449.5', compra: '445.2' }),
  filaDelRango({ moneda: '16', fecha: '18/11/2026', venta: '449.04', compra: '444.77' }),
  filaDelRango({ moneda: '16', fecha: '19/11/2026', venta: '4.4904E2', compra: '4.4477E2' }),
]);

/** Rango del ARS (29) con cinco decimales: el promedio de compra y venta necesita un decimal más. */
export const RANGO_DEL_ARS = respuestaDelRangoDeMoneda([
  filaDelRango({ moneda: '29', fecha: '18/11/2026', venta: '1556.18018', compra: '1555.84009' }),
]);

/** Rango del dólar de Semana Santa de 2026: el miércoles 1 de abril repetido el jueves, el viernes, el sábado y el domingo. */
export const RANGO_DE_SEMANA_SANTA = respuestaDelRango([
  filaDelRango({ fecha: '01/04/2026', venta: '7.64121' }),
  filaDelRango({ fecha: '02/04/2026', venta: '7.64121' }),
  filaDelRango({ fecha: '03/04/2026', venta: '7.64121' }),
  filaDelRango({ fecha: '04/04/2026', venta: '7.64121' }),
  filaDelRango({ fecha: '05/04/2026', venta: '7.64121' }),
]);

/** Rango del 13 al 18 de noviembre de 2026: el sábado 14 y el domingo 15 repiten el valor del viernes. */
export const RANGO_CON_FIN_DE_SEMANA = respuestaDelRango([
  filaDelRango({ fecha: '13/11/2026', venta: '7.64312' }),
  filaDelRango({ fecha: '14/11/2026', venta: '7.64312' }),
  filaDelRango({ fecha: '15/11/2026', venta: '7.64312' }),
  filaDelRango({ fecha: '16/11/2026', venta: '7.63914' }),
  filaDelRango({ fecha: '17/11/2026', venta: '7.63985' }),
  filaDelRango({ fecha: '18/11/2026', venta: '7.64489' }),
]);

/** Respuesta con entidades externas (ataque XXE). */
export const RESPUESTA_CON_DOCTYPE =
  '<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]>' +
  respuestaDelDia('18/11/2026', '7.64489');

/** Falla SOAP, como la que manda un servidor con error. */
export const FALLA_SOAP = `${ENCABEZADO}<soap:Fault><faultcode>soap:Server</faultcode><faultstring>Error</faultstring></soap:Fault>${PIE}`;
