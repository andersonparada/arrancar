const FIN = 0xfffffffe;
const LIBRE = 0xffffffff;
const SECTOR_DE_FAT = 0xfffffffd;
const CORTE = 4096;
const MINI = 64;
const FIRMA = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

/** Una entrada del directorio de prueba: un flujo con datos o un almacén (storage) vacío. */
export interface FlujoDePrueba {
  nombre: string;
  datos: Buffer;
  tipo?: 'flujo' | 'almacen';
}

const redondear = (valor: number, multiplo: number) => Math.ceil(valor / multiplo) * multiplo;

interface DatosDeEntrada {
  nombre: string;
  tipo: number;
  inicio: number;
  tamano: number;
}

function entradaDeDirectorio({ nombre, tipo, inicio, tamano }: DatosDeEntrada): Buffer {
  const entrada = Buffer.alloc(128);
  entrada.write(nombre, 0, 'utf16le');
  entrada.writeUInt16LE((nombre.length + 1) * 2, 64);
  entrada.writeUInt8(tipo, 66);
  entrada.writeUInt32LE(LIBRE, 68);
  entrada.writeUInt32LE(LIBRE, 72);
  entrada.writeUInt32LE(LIBRE, 76);
  entrada.writeUInt32LE(inicio, 116);
  entrada.writeUInt32LE(tamano, 120);
  return entrada;
}

/** Sectores de datos que se van agregando con su cadena en la FAT. */
class Sectores {
  readonly datos: Buffer[] = [];
  readonly enlaces: number[] = [];

  constructor(private readonly tamano: number) {}

  /** Agrega los bytes en sectores seguidos, rellenados con ceros; devuelve el primero (o el fin si no hay bytes). */
  cadena(bytes: Buffer): number {
    if (bytes.length === 0) return FIN;
    const cuantos = Math.ceil(bytes.length / this.tamano);
    const primero = this.datos.length;
    for (let i = 0; i < cuantos; i++) {
      this.datos.push(Buffer.concat([bytes.subarray(i * this.tamano, (i + 1) * this.tamano)], this.tamano));
      this.enlaces.push(i < cuantos - 1 ? primero + i + 1 : FIN);
    }
    return primero;
  }
}

function enteros(valores: number[]): Buffer {
  const bytes = Buffer.alloc(valores.length * 4);
  valores.forEach((valor, i) => bytes.writeUInt32LE(valor, i * 4));
  return bytes;
}

/** Los flujos chicos van uno tras otro en el mini flujo, con su mini FAT. */
function armarMiniFlujo(chicos: FlujoDePrueba[]) {
  const partes: Buffer[] = [];
  const miniFat: number[] = [];
  const inicios = new Map<string, number>();
  for (const flujo of chicos) {
    const sectores = Math.ceil(flujo.datos.length / MINI);
    inicios.set(flujo.nombre, miniFat.length);
    for (let i = 0; i < sectores; i++) miniFat.push(i < sectores - 1 ? miniFat.length + 1 : FIN);
    partes.push(Buffer.concat([flujo.datos], sectores * MINI));
  }
  return { miniFlujo: Buffer.concat(partes), miniFat, inicios };
}

/**
 * Arma un contenedor OLE2 (CFB) de prueba: flujos de 4096 bytes o más en sectores normales y los chicos en el mini
 * flujo. Sirve para armar `.xls` de verdad y, con almacenes o nombres raros, archivos que deben rechazarse.
 * @param tamanoDeSector 512 (versión 3) o 4096 (versión 4).
 */
export function cfbDePrueba(flujos: FlujoDePrueba[], tamanoDeSector: 512 | 4096 = 512): Buffer {
  const sectores = new Sectores(tamanoDeSector);
  const conDatos = flujos.filter((flujo) => flujo.tipo !== 'almacen' && flujo.datos.length > 0);
  const chicos = conDatos.filter((flujo) => flujo.datos.length < CORTE);
  const inicios = new Map(
    conDatos
      .filter((flujo) => flujo.datos.length >= CORTE)
      .map((flujo) => [flujo.nombre, sectores.cadena(flujo.datos)]),
  );
  const mini = armarMiniFlujo(chicos);
  const inicioDeLaRaiz = sectores.cadena(mini.miniFlujo);
  const inicioDeLaMiniFat = sectores.cadena(enteros(mini.miniFat));
  const entradas = [
    entradaDeDirectorio({ nombre: 'Root Entry', tipo: 5, inicio: inicioDeLaRaiz, tamano: mini.miniFlujo.length }),
    ...flujos.map((flujo) => {
      const inicio = mini.inicios.get(flujo.nombre) ?? inicios.get(flujo.nombre) ?? FIN;
      const tipo = flujo.tipo === 'almacen' ? 1 : 2;
      return entradaDeDirectorio({ nombre: flujo.nombre, tipo, inicio, tamano: flujo.datos.length });
    }),
  ];
  const directorio = Buffer.concat(entradas, redondear(entradas.length * 128, tamanoDeSector));
  const inicioDelDirectorio = sectores.cadena(directorio);
  return ensamblar({ sectores, inicioDelDirectorio, inicioDeLaMiniFat, sectoresDeLaMiniFat: mini.miniFat.length });
}

/** La cabecera del contenedor: versión, tamaños, dónde empiezan el directorio y la mini FAT, y la lista de la FAT. */
function cabeceraDePrueba(tamano: number, datos: { sectoresDeFat: number; primerSectorDeFat: number }): Buffer {
  const cabecera = Buffer.alloc(tamano);
  FIRMA.copy(cabecera, 0);
  cabecera.writeUInt16LE(0x3e, 24);
  cabecera.writeUInt16LE(tamano === 512 ? 3 : 4, 26);
  cabecera.writeUInt16LE(0xfffe, 28);
  cabecera.writeUInt16LE(tamano === 512 ? 9 : 12, 30);
  cabecera.writeUInt16LE(6, 32);
  cabecera.writeUInt32LE(datos.sectoresDeFat, 44);
  cabecera.writeUInt32LE(CORTE, 56);
  cabecera.writeUInt32LE(FIN, 68);
  const ids = Array.from({ length: 109 }, (_, i) => (i < datos.sectoresDeFat ? datos.primerSectorDeFat + i : LIBRE));
  enteros(ids).copy(cabecera, 76);
  return cabecera;
}

function ensamblar(partes: {
  sectores: Sectores;
  inicioDelDirectorio: number;
  inicioDeLaMiniFat: number;
  sectoresDeLaMiniFat: number;
}): Buffer {
  const { sectores, inicioDelDirectorio, inicioDeLaMiniFat } = partes;
  const tamano = sectores.datos[0]?.length ?? 512;
  let sectoresDeFat = 1;
  while (sectoresDeFat * (tamano / 4) < sectores.datos.length + sectoresDeFat) sectoresDeFat++;
  const fat = [...sectores.enlaces, ...Array<number>(sectoresDeFat).fill(SECTOR_DE_FAT)];
  const fatEnBytes = Buffer.concat([enteros(fat)], sectoresDeFat * tamano).fill(0xff, fat.length * 4);
  const cabecera = cabeceraDePrueba(tamano, { sectoresDeFat, primerSectorDeFat: sectores.datos.length });
  cabecera.writeUInt32LE(inicioDelDirectorio, 48);
  cabecera.writeUInt32LE(inicioDeLaMiniFat, 60);
  cabecera.writeUInt32LE(Math.ceil((partes.sectoresDeLaMiniFat * 4) / tamano), 64);
  return Buffer.concat([cabecera, ...sectores.datos, fatEnBytes]);
}
