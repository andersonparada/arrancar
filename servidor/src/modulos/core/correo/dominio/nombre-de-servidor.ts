import { isIP } from 'node:net';
import { ServidorDeCorreoInvalido } from './errores-del-servidor-de-correo.js';

const MAXIMO = 253;
const ETIQUETA = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
const SUFIJOS_INTERNOS = ['.local', '.localhost', '.internal', '.localdomain', '.lan', '.home.arpa'];

/** Bloques IPv4 que no son de internet (primer byte, y rango del segundo): privados, bucle local, enlace local, CGNAT, pruebas de red y reservados. */
const BLOQUES_INTERNOS: ReadonlyArray<readonly [primero: number, desde: number, hasta: number]> = [
  [0, 0, 255],
  [10, 0, 255],
  [127, 0, 255],
  [100, 64, 127],
  [169, 254, 254],
  [172, 16, 31],
  [192, 0, 0],
  [192, 168, 168],
  [198, 18, 19],
];

function esIpv4Interna(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number) as [number, number];
  return a >= 224 || BLOQUES_INTERNOS.some(([primero, desde, hasta]) => a === primero && b >= desde && b <= hasta);
}

function esNombreInterno(nombre: string): boolean {
  return !nombre.includes('.') || SUFIJOS_INTERNOS.some((sufijo) => nombre.endsWith(sufijo));
}

function noEsDeInternet(nombre: string): boolean {
  if (isIP(nombre) === 4) return esIpv4Interna(nombre);
  return esNombreInterno(nombre);
}

/**
 * Nombre de dominio (o IPv4 pública) del servidor de correo, en minúsculas. Rechaza lo que apunta a la red
 * interna (C12): nombres sin punto como `postgres`, `app` o `caddy` (los del compose), sufijos internos y
 * direcciones privadas, y todo IPv6. Con `permitirRedInterna` (solo desarrollo) acepta esos nombres.
 * @throws ServidorDeCorreoInvalido
 */
export function nombreDeServidorValido(texto: string, permitirRedInterna: boolean): string {
  const nombre = texto.trim().toLowerCase();
  const esIp = isIP(nombre) === 4;
  const formaValida =
    nombre.length >= 1 && nombre.length <= MAXIMO && (esIp || nombre.split('.').every((e) => ETIQUETA.test(e)));
  if (!formaValida)
    throw new ServidorDeCorreoInvalido('Escriba el nombre del servidor de correo, como smtp.proveedor.com.');
  if (!permitirRedInterna && noEsDeInternet(nombre)) {
    throw new ServidorDeCorreoInvalido(
      'El servidor de correo debe ser un nombre o una dirección de internet, no de la red interna.',
    );
  }
  return nombre;
}
