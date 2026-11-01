import { ArchivoNoLegible } from '../../../aplicacion/errores.js';
import type { FilaCruda } from '../../../aplicacion/puertos/lector-de-filas.js';
import { celdasDelRegistro, leerCadenaConLargo, type CeldaBiff } from './celdas-biff.js';
import { RejillaDeCeldas } from './rejilla-de-celdas.js';
import {
  exigirInicioDeBiff8,
  exigirRegistroPermitido,
  REGISTRO,
  registrosDe,
  SUBFLUJO_DE_HOJA,
  type RegistroBiff,
} from './registros-biff.js';
import { leerTablaDeCadenas } from './tabla-de-cadenas-biff.js';

type Zona = 'antes' | 'globales' | 'entre' | 'primera-hoja' | 'despues';

const conTexto = (celda: CeldaBiff): celda is CeldaBiff & { texto: string } => celda.texto !== null;

/**
 * Lee la primera hoja de un libro BIFF8 recorriendo sus registros una sola vez. En el área global toma la posición de
 * la primera hoja y la tabla de cadenas; en la hoja, sus celdas con valor. Todos los registros, de cualquier hoja,
 * pasan por `exigirRegistroPermitido`.
 */
class LectorDeBiff8 {
  private zona: Zona = 'antes';
  private posicionDeLaPrimeraHoja: number | null = null;
  private cadenas: string[] | null = null;
  private segmentosDeCadenas: Buffer[] | null = null;
  private formulaDeTexto: CeldaBiff | null = null;
  private readonly rejilla = new RejillaDeCeldas();

  leer(libro: Buffer): FilaCruda[] {
    for (const registro of registrosDe(libro)) this.procesar(registro);
    if (this.zona !== 'despues') throw new ArchivoNoLegible();
    return this.rejilla.aFilas();
  }

  private procesar(registro: RegistroBiff): void {
    if (this.zona === 'antes') {
      exigirInicioDeBiff8(registro);
      this.zona = 'globales';
      return;
    }
    exigirRegistroPermitido(registro);
    if (registro.tipo !== REGISTRO.CONTINUE) this.cerrarTablaDeCadenas();
    if (registro.tipo === REGISTRO.BOF) this.abrirSubflujo(registro);
    else if (registro.tipo === REGISTRO.EOF) this.cerrarSubflujo();
    else if (this.zona === 'globales') this.registroGlobal(registro);
    else if (this.zona === 'primera-hoja') this.registroDeLaHoja(registro);
  }

  private abrirSubflujo({ inicio, datos }: RegistroBiff): void {
    const esDeHoja = datos.readUInt16LE(2) === SUBFLUJO_DE_HOJA;
    if (!esDeHoja || this.zona === 'globales' || this.zona === 'primera-hoja') throw new ArchivoNoLegible();
    if (this.zona === 'entre' && inicio === this.posicionDeLaPrimeraHoja) this.zona = 'primera-hoja';
  }

  private cerrarSubflujo(): void {
    if (this.zona === 'globales') this.zona = 'entre';
    else if (this.zona === 'primera-hoja') this.zona = 'despues';
  }

  private registroGlobal({ tipo, datos }: RegistroBiff): void {
    if (tipo === REGISTRO.BOUNDSHEET && this.posicionDeLaPrimeraHoja === null) {
      if (datos.length < 4) throw new ArchivoNoLegible();
      this.posicionDeLaPrimeraHoja = datos.readUInt32LE(0);
    } else if (tipo === REGISTRO.SST) {
      if (this.cadenas) throw new ArchivoNoLegible();
      this.segmentosDeCadenas = [datos];
    } else if (tipo === REGISTRO.CONTINUE) {
      this.segmentosDeCadenas?.push(datos);
    }
  }

  private cerrarTablaDeCadenas(): void {
    if (!this.segmentosDeCadenas) return;
    this.cadenas = leerTablaDeCadenas(this.segmentosDeCadenas);
    this.segmentosDeCadenas = null;
  }

  private registroDeLaHoja({ tipo, datos }: RegistroBiff): void {
    if (tipo === REGISTRO.STRING) return this.ponerTextoDeFormula(leerCadenaConLargo(datos, 0));
    for (const celda of celdasDelRegistro(tipo, datos, this.cadenas ?? [])) {
      if (conTexto(celda)) this.rejilla.poner(celda);
      else this.formulaDeTexto = celda;
    }
  }

  private ponerTextoDeFormula(texto: string): void {
    if (!this.formulaDeTexto) return;
    this.rejilla.poner({ ...this.formulaDeTexto, texto });
    this.formulaDeTexto = null;
  }
}

/** Todas las filas no vacías de la primera hoja de un libro BIFF8, con cada celda como texto. */
export function leerHojaDeBiff8(libro: Buffer): FilaCruda[] {
  return new LectorDeBiff8().leer(libro);
}
