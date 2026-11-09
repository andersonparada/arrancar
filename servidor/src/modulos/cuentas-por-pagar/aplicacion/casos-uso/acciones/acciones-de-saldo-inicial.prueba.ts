import { beforeEach, describe, expect, it } from 'vitest';
import {
  AuditoriaEnMemoria,
  PublicadorEventosEnMemoria,
  RelojFijo,
  UnidadDeTrabajoEnMemoria,
  operadorDePrueba,
} from '../../../../core/compartido/pruebas/dobles-compartidos.js';
import { ConsultasEnMemoria, LibroDeComprasEnMemoria } from '../../../pruebas/dobles-de-acciones.js';
import { AplicacionesEnMemoria, DocumentosEnMemoria } from '../../../pruebas/dobles-de-documentos.js';
import { AutorizarDocumentos } from './autorizar-documentos.js';
import { DesautorizarDocumento } from './desautorizar-documento.js';

const ana = operadorDePrueba();
const beto = operadorDePrueba({ cuentaId: ana.cuentaId, empresaId: ana.empresaId });

let documentos: DocumentosEnMemoria;
let eventos: PublicadorEventosEnMemoria;
let libro: LibroDeComprasEnMemoria;
let autorizar: AutorizarDocumentos;
let desautorizar: DesautorizarDocumento;

beforeEach(() => {
  documentos = new DocumentosEnMemoria(new AplicacionesEnMemoria());
  eventos = new PublicadorEventosEnMemoria();
  libro = new LibroDeComprasEnMemoria(documentos.bitacora);
  const dependencias = {
    unidadDeTrabajo: new UnidadDeTrabajoEnMemoria(),
    documentos,
    consultas: new ConsultasEnMemoria(documentos),
    reloj: new RelojFijo(),
    auditoria: new AuditoriaEnMemoria(),
    publicadorEventos: eventos,
    libroDeCompras: libro,
  };
  autorizar = new AutorizarDocumentos(dependencias);
  desautorizar = new DesautorizarDocumento(dependencias);
});

/** Un saldo inicial completado: no tiene documento en Libro de compras. */
function sembrarSaldoInicial(): string {
  const id = crypto.randomUUID();
  documentos.documentos.push({
    id,
    origen: 'saldo_inicial',
    documentoId: null,
    serie: 'S',
    numero: '1',
    tipo: 'factura',
    proveedorId: crypto.randomUUID(),
    documentoAfectadoId: null,
    fechaEmision: '2025-12-20',
    totalCentavos: 11200,
    retencionesCentavos: 0,
    saldoAlInicioCentavos: 7000,
    retencionesPorPracticarCentavos: 0,
    referencia: null,
    tieneActivoFijo: false,
    vencimiento: '2026-01-20',
    ingresadoPor: ana.usuarioId,
    estado: 'registrado',
    registradoEn: '2026-03-10T00:00:00.000Z',
    registradoPor: ana.usuarioId,
    autorizadoEn: null,
    autorizadoPor: null,
    autorizacionPropia: false,
  });
  return id;
}

describe('un saldo inicial', () => {
  it('se autoriza y se desautoriza sin tocar Libro de compras, y los eventos llevan el origen', async () => {
    const id = sembrarSaldoInicial();

    await autorizar.ejecutar(beto, { ids: [id], puedeAutorizarPropios: false });
    await desautorizar.ejecutar(beto, { id, motivo: 'Se autorizó por error' });

    expect(libro.procesados.size).toBe(0);
    expect(documentos.documentos[0]!.estado).toBe('registrado');
    expect(eventos.publicados.map((evento) => evento.datos)).toEqual([
      expect.objectContaining({ documentoDeCompraId: null, origen: 'saldo_inicial' }),
      expect.objectContaining({ documentoDeCompraId: null, origen: 'saldo_inicial' }),
    ]);
  });
});
