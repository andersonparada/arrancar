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

/** Lista de monedas con forma del servicio real (descripciones inventadas para la prueba). */
export const LISTA_DE_MONEDAS = respuestaDeLasVariables([
  { moneda: '2', descripcion: 'Dólares de EE.UU.' },
  { moneda: '28', descripcion: '  Euro ' },
  { moneda: '9', descripcion: 'Yen &amp; otras' },
  { moneda: '2', descripcion: 'Repetida' },
  { moneda: 'x', descripcion: 'Código inválido' },
  { moneda: '30', descripcion: '' },
]);

/** Rango del EUR (código 28) con fin de semana repetido, un valor en notación científica y otro con más de 8 decimales. */
export const RANGO_DEL_EUR = respuestaDelRangoDeMoneda([
  filaDelRango({ moneda: '28', fecha: '13/11/2026', venta: '8.81234' }),
  filaDelRango({ moneda: '28', fecha: '14/11/2026', venta: '8.81234' }),
  filaDelRango({ moneda: '28', fecha: '16/11/2026', venta: '8.8E0' }),
  filaDelRango({ moneda: '28', fecha: '17/11/2026', venta: '8.812345678' }),
  filaDelRango({ moneda: '28', fecha: '18/11/2026', venta: '8.82', compra: '8.81' }),
  filaDelRango({ moneda: '99', fecha: '18/11/2026', venta: '1.5' }),
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
