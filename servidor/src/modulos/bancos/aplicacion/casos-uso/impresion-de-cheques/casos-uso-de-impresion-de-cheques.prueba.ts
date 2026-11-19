import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import {
  AuditoriaEnMemoria,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { Cheque } from '../../../dominio/cheque.js';
import {
  ChequeNoImprimible,
  ChequeSinImprimirNoSeReimprime,
  ChequeYaImpreso,
  ChequeraSinFormatoDeImpresion,
  LoteDeChequesInvalido,
  MotivoDeImpresionInvalido,
} from '../../../dominio/errores-de-impresion.js';
import { LugarDeEmisionFijo } from '../../../pruebas/dobles-de-formatos-de-cheque.js';
import type { ChequeParaImprimir, NuevaImpresionDeCheque } from '../../puertos/impresion-de-cheques.js';
import type { DependenciasDeImpresionDeCheques } from './dependencias-de-impresion-de-cheques.js';
import { HistorialDeImpresiones } from './historial-de-impresiones.js';
import { ImprimirCheques } from './imprimir-cheques.js';
import { ReimprimirCheque } from './reimprimir-cheque.js';
import { VistaPreviaDeImpresion } from './vista-previa-de-impresion.js';

const operador = operadorDePrueba();
const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
const CHEQUERA = '00000000-0000-4000-8000-0000000000c1';

let cheques: Map<string, ChequeParaImprimir>;
let entidades: Map<string, Cheque>;
let impresiones: NuevaImpresionDeCheque[];
let auditoria: AuditoriaEnMemoria;
let casos: ReturnType<typeof armar>;

function chequeDe(numero: number, cambios: Partial<ChequeParaImprimir> = {}): ChequeParaImprimir {
  return {
    chequeId: crypto.randomUUID(),
    numero,
    estado: 'emitido',
    impresoEn: null,
    noNegociable: true,
    chequeraId: CHEQUERA,
    serie: null,
    chequeraDeApertura: false,
    formatoDeChequeId: null,
    plantillaDeCheque: 'cheque_suelto',
    movimiento: {
      id: crypto.randomUUID(),
      fecha: '2026-11-18',
      montoCentavos: 112000,
      beneficiario: 'JUAN PÉREZ LÓPEZ',
      conceptoNombre: 'Pago a proveedores',
      referencia: null,
      observaciones: null,
      paraAbonoEnCuenta: false,
      moduloDeOrigen: null,
      elaboro: 'Ana Gómez',
    },
    cuenta: { nombre: 'Operativa', numero: '123-4', banco: 'Banrural' },
    impresiones: 0,
    ...cambios,
  };
}

function agregar(cheque: ChequeParaImprimir): ChequeParaImprimir {
  cheques.set(cheque.chequeId, cheque);
  const entidad = Cheque.crear(empresaId, cheque.chequeraId, cheque.numero);
  entidades.set(
    cheque.chequeId,
    Cheque.reconstruir({ ...entidad.instantanea(), id: Identificador.desde(cheque.chequeId) }),
  );
  return cheque;
}

function armar() {
  const dependencias: DependenciasDeImpresionDeCheques = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    repositorio: {
      buscar: async (id) => entidades.get(id.valor) ?? null,
      guardar: async (cheque) => {
        entidades.set(cheque.id.valor, cheque);
        const marca = cheque.instantanea().impresoEn;
        const visto = cheques.get(cheque.id.valor)!;
        cheques.set(cheque.id.valor, { ...visto, impresoEn: marca, impresiones: visto.impresiones + 1 });
      },
      agregarVarios: async () => {},
    },
    consultasDeCheques: { obtener: async (id: string) => ({ id }) } as never,
    consultas: {
      chequesParaImprimir: async (ids) => ids.flatMap((id) => cheques.get(id) ?? []),
      historial: async () => [],
    },
    impresiones: { agregar: async (impresion) => void impresiones.push(impresion) },
    formatos: { buscar: async () => null, agregar: async () => {}, guardar: async () => {}, eliminar: async () => {} },
    lugarDeEmision: new LugarDeEmisionFijo(),
    empresa: { obtener: async () => ({ nombre: 'Rancho Uno', nit: '1234567-8' }) },
    origen: { de: async () => null },
    auditoria,
  };
  return {
    vista: new VistaPreviaDeImpresion(dependencias),
    imprimir: new ImprimirCheques(dependencias),
    reimprimir: new ReimprimirCheque(dependencias),
    historial: new HistorialDeImpresiones(dependencias),
  };
}

beforeEach(() => {
  cheques = new Map();
  entidades = new Map();
  impresiones = [];
  auditoria = new AuditoriaEnMemoria();
  casos = armar();
});

describe('la vista previa', () => {
  it('arma el cheque y el comprobante y no marca nada', async () => {
    const cheque = agregar(chequeDe(1));

    const vista = await casos.vista.ejecutar(operador, [cheque.chequeId]);

    expect(vista.cheques[0]).toMatchObject({ numero: 1, impreso: false, comprobante: { esReimpresion: false } });
    expect(vista.cheques[0]!.cheque?.campos.find((c) => c.clave === 'montoEnLetras')?.texto).toMatch(
      /^MIL CIENTO VEINTE QUETZALES CON 00\/100\*+$/,
    );
    expect(vista.cheques[0]!.zonaDelComprobante).toBeNull();
    expect(impresiones).toEqual([]);
    expect(entidades.get(cheque.chequeId)!.estaImpreso).toBe(false);
  });

  it('con un voucher dice dónde va el comprobante dentro de la hoja', async () => {
    const cheque = agregar(chequeDe(1, { plantillaDeCheque: 'voucher_carta_arriba' }));

    const vista = await casos.vista.ejecutar(operador, [cheque.chequeId]);

    expect(vista.cheques[0]!.zonaDelComprobante).toEqual({ yMm: 100, altoMm: 170 });
  });

  it('un cheque ya impreso sale como copia, y los huecos del lote avisan', async () => {
    const impreso = agregar(chequeDe(1, { impresoEn: new Date(), impresiones: 1 }));
    const otro = agregar(chequeDe(4));

    const vista = await casos.vista.ejecutar(operador, [impreso.chequeId, otro.chequeId]);

    expect(vista.cheques[0]).toMatchObject({ impreso: true, comprobante: { esReimpresion: true } });
    expect(vista.avisos).toEqual(['Entre el 1 y el 4 faltan los cheques 2 a 3: el papel va en orden.']);
  });

  it('un cheque ajeno no existe; sin formato o de la carga inicial no se imprime', async () => {
    const sinFormato = agregar(chequeDe(2, { plantillaDeCheque: null }));
    const deApertura = agregar(chequeDe(3, { chequeraDeApertura: true }));
    const disponible = agregar(chequeDe(4, { estado: 'disponible', movimiento: null }));

    await expect(casos.vista.ejecutar(operador, [crypto.randomUUID()])).rejects.toThrow(RecursoNoEncontrado);
    await expect(casos.vista.ejecutar(operador, [sinFormato.chequeId])).rejects.toThrow(ChequeraSinFormatoDeImpresion);
    await expect(casos.vista.ejecutar(operador, [deApertura.chequeId])).rejects.toThrow(ChequeNoImprimible);
    await expect(casos.vista.ejecutar(operador, [disponible.chequeId])).rejects.toThrow(ChequeNoImprimible);
  });
});

describe('imprimir', () => {
  it('marca el cheque y guarda la impresión original con el formato resuelto', async () => {
    const cheque = agregar(chequeDe(1));

    const vista = await casos.imprimir.ejecutar(operador, [cheque.chequeId]);

    expect(vista).toMatchObject({ loteId: null, cheques: [{ impreso: true }] });
    expect(entidades.get(cheque.chequeId)!.estaImpreso).toBe(true);
    expect(impresiones).toEqual([
      expect.objectContaining({
        chequeId: cheque.chequeId,
        movimientoId: cheque.movimiento!.id,
        tipo: 'original',
        conCheque: true,
        motivo: null,
        loteId: null,
        formato: expect.objectContaining({ papel: { anchoMm: 175, altoMm: 76 } }),
      }),
    ]);
  });

  it('un lote lleva un mismo identificador y un cheque ya impreso lo detiene entero', async () => {
    const uno = agregar(chequeDe(1));
    const dos = agregar(chequeDe(2));
    const impreso = agregar(chequeDe(3, { impresoEn: new Date(), impresiones: 1 }));

    await expect(casos.imprimir.ejecutar(operador, [uno.chequeId, impreso.chequeId])).rejects.toThrow(ChequeYaImpreso);
    expect(impresiones).toEqual([]);
    const lote = await casos.imprimir.ejecutar(operador, [uno.chequeId, dos.chequeId]);

    expect(lote.loteId).toBeTruthy();
    expect(new Set(impresiones.map((i) => i.loteId))).toEqual(new Set([lote.loteId]));
  });

  it('rechaza más de 50, ninguno y dos chequeras', async () => {
    const uno = agregar(chequeDe(1));
    const deOtra = agregar(chequeDe(2, { chequeraId: '00000000-0000-4000-8000-0000000000c2' }));

    await expect(casos.imprimir.ejecutar(operador, [])).rejects.toThrow(LoteDeChequesInvalido);
    await expect(
      casos.imprimir.ejecutar(
        operador,
        Array.from({ length: 51 }, () => crypto.randomUUID()),
      ),
    ).rejects.toThrow(LoteDeChequesInvalido);
    await expect(casos.imprimir.ejecutar(operador, [uno.chequeId, deOtra.chequeId])).rejects.toThrow(
      LoteDeChequesInvalido,
    );
  });
});

describe('reimprimir', () => {
  it('exige motivo, guarda la copia y deja la auditoría con las impresiones anteriores', async () => {
    const cheque = agregar(chequeDe(1, { impresoEn: new Date(), impresiones: 1 }));
    const pedido = { chequeId: cheque.chequeId, conCheque: false };

    await expect(casos.reimprimir.ejecutar(operador, { ...pedido, motivo: '  ' })).rejects.toThrow(
      MotivoDeImpresionInvalido,
    );
    const copia = await casos.reimprimir.ejecutar(operador, { ...pedido, motivo: ' Otra copia ' });

    expect(copia).toMatchObject({ cheque: null, comprobante: { esReimpresion: true } });
    expect(impresiones).toEqual([
      expect.objectContaining({ tipo: 'reimpresion', conCheque: false, motivo: 'Otra copia' }),
    ]);
    expect(auditoria.entradas).toEqual([
      expect.objectContaining({
        recurso: 'bancos.cheques',
        accion: 'reimprimir',
        motivo: 'Otra copia',
        anterior: expect.objectContaining({ impresiones: [] }),
      }),
    ]);
  });

  it('uno que todavía no se imprimió no se reimprime', async () => {
    const cheque = agregar(chequeDe(1));

    await expect(
      casos.reimprimir.ejecutar(operador, { chequeId: cheque.chequeId, motivo: 'Copia', conCheque: true }),
    ).rejects.toThrow(ChequeSinImprimirNoSeReimprime);
  });
});

describe('la historia', () => {
  it('es de un cheque que existe', async () => {
    const cheque = agregar(chequeDe(1));

    expect(await casos.historial.ejecutar(operador, cheque.chequeId)).toEqual([]);
    await expect(casos.historial.ejecutar(operador, crypto.randomUUID())).rejects.toThrow(RecursoNoEncontrado);
  });
});
