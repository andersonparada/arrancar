const FORMATO_BANGUAT = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const FORMATO_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_POR_DIA = 86_400_000;

/** Medianoche UTC de una fecha `AAAA-MM-DD`, o `undefined` si no existe en el calendario. */
function enUtc(fecha: string): Date | undefined {
  const partes = FORMATO_ISO.exec(fecha);
  if (!partes) return undefined;
  const instante = new Date(Date.UTC(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])));
  return instante.toISOString().slice(0, 10) === fecha ? instante : undefined;
}

/** `dd/mm/aaaa` (formato del Banguat) a `AAAA-MM-DD`; `undefined` si no es una fecha real. */
export function fechaDelBanguatAIso(texto: string): string | undefined {
  const partes = FORMATO_BANGUAT.exec(texto);
  if (!partes) return undefined;
  const fecha = `${partes[3]}-${partes[2]}-${partes[1]}`;
  return enUtc(fecha) ? fecha : undefined;
}

/** `AAAA-MM-DD` a `dd/mm/aaaa`, lo que pide el servicio. @throws RangeError si la fecha no existe. */
export function fechaIsoAlBanguat(fecha: string): string {
  if (!enUtc(fecha)) throw new RangeError(`Fecha inválida: ${fecha}`);
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** La fecha `dias` días después (o antes, si es negativo). @throws RangeError si la fecha no existe. */
export function sumarDiasAFecha(fecha: string, dias: number): string {
  const base = enUtc(fecha);
  if (!base) throw new RangeError(`Fecha inválida: ${fecha}`);
  return new Date(base.getTime() + dias * MS_POR_DIA).toISOString().slice(0, 10);
}

/** Todas las fechas de `desde` a `hasta`, ambas incluidas. */
export function fechasDelRango(desde: string, hasta: string): string[] {
  const fechas: string[] = [];
  for (let dia = desde; dia <= hasta; dia = sumarDiasAFecha(dia, 1)) fechas.push(dia);
  return fechas;
}

/**
 * Si el Banguat publica las monedas distintas del dólar ese día: de lunes a viernes, también en los asuetos de
 * Guatemala y del mercado (jueves santo, 25 de diciembre) y nunca en sábado ni domingo (adenda B.2 y B.9).
 * @throws RangeError si la fecha no existe.
 */
export function esDiaDePublicacionDeCruces(fecha: string): boolean {
  const instante = enUtc(fecha);
  if (!instante) throw new RangeError(`Fecha inválida: ${fecha}`);
  const diaDeLaSemana = instante.getUTCDay();
  return diaDeLaSemana !== 0 && diaDeLaSemana !== 6;
}

/** Los días de `desde` a `hasta` (ambos incluidos) en que se espera la publicación de las demás monedas. */
export function diasDePublicacionDeCruces(desde: string, hasta: string): Set<string> {
  return new Set(fechasDelRango(desde, hasta).filter(esDiaDePublicacionDeCruces));
}
