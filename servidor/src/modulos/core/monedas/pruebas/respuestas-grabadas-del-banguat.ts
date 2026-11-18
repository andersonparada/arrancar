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

/** Respuesta de `TipoCambioRango` con las filas dadas (sin filas: `<Vars />`, como responde el servicio). */
export function respuestaDelRango(filas: readonly string[]): string {
  const vars = filas.length > 0 ? `<Vars>${filas.join('')}</Vars>` : '<Vars />';
  return (
    `${ENCABEZADO}<TipoCambioRangoResponse ${NS}><TipoCambioRangoResult>${vars}` +
    `<TotalItems>${filas.length}</TotalItems></TipoCambioRangoResult></TipoCambioRangoResponse>${PIE}`
  );
}

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
