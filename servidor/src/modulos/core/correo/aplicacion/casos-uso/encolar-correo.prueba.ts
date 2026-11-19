import { beforeEach, describe, expect, it } from 'vitest';
import { operadorDePrueba } from '../../../compartido/pruebas/dobles-compartidos.js';
import { DireccionNoUtilizable } from '../../dominio/errores-de-correo.js';
import { AdjuntoNoValido, CupoDeCorreosAgotado } from '../../dominio/errores-de-la-bandeja.js';
import {
  DocumentosFalsos,
  ParametrosFijos,
  RepositorioDeCorreosEnMemoria,
  TareasEnLaTransaccion,
} from '../../pruebas/dobles-de-la-bandeja.js';
import type { MensajePorEncolar } from '../bandeja-de-salida.js';
import { BandejaDeSalidaDeCore, EncolarCorreo, RECURSO_DE_ADJUNTOS } from './encolar-correo.js';

const MENSAJE: MensajePorEncolar = {
  tipo: 'cuentas-por-pagar.aviso_de_pago',
  origen: { recurso: 'cuentas-por-pagar.pagos', registroId: 'pago-1' },
  empresa: 'Rancho Los Pinos',
  responderA: 'empresa@ejemplo.com',
  destinatarios: [
    { direccion: 'proveedor@ejemplo.com', nombre: 'Proveedor', clase: 'para', origen: 'contacto', origenId: 'c-1' },
    { direccion: 'empresa@ejemplo.com', nombre: null, clase: 'copia', origen: 'empresa', origenId: null },
  ],
  plantilla: {
    asunto: 'Aviso de pago {numero} – {empresa}',
    mensaje: 'Estimado {proveedor}: registramos el pago {numero}.',
    marcadoresDelAsunto: ['numero', 'empresa'],
    marcadoresDelMensaje: ['numero', 'empresa', 'proveedor'],
    valores: { numero: '12', empresa: 'Rancho Los Pinos', proveedor: 'Proveedor' },
  },
  adjunto: null,
};
const PDF = Buffer.from('%PDF-1.7\ncontenido');

let repositorio: RepositorioDeCorreosEnMemoria;
let documentos: DocumentosFalsos;
let tareas: TareasEnLaTransaccion;
let despertares: number;
let encolar: EncolarCorreo;

beforeEach(() => {
  repositorio = new RepositorioDeCorreosEnMemoria();
  documentos = new DocumentosFalsos();
  tareas = new TareasEnLaTransaccion();
  despertares = 0;
  encolar = new EncolarCorreo({
    repositorio,
    documentos,
    parametros: new ParametrosFijos(),
    tareas,
    despertador: { despertar: () => (despertares += 1) },
    dominioDeMensajes: 'arrancar.test',
  });
});

describe('EncolarCorreo', () => {
  it('arma el correo, lo inserta y devuelve su resumen', async () => {
    const dto = await encolar.ejecutar(operadorDePrueba(), MENSAJE);

    expect(dto).toEqual({
      id: 'correo-1',
      estado: 'pendiente',
      asunto: 'Aviso de pago 12 – Rancho Los Pinos',
      destinatarios: [
        { direccion: 'proveedor@ejemplo.com', clase: 'para' },
        { direccion: 'empresa@ejemplo.com', clase: 'copia' },
      ],
    });
    const [correo] = repositorio.insertados;
    expect(correo).toMatchObject({
      tipo: 'cuentas-por-pagar.aviso_de_pago',
      origen: MENSAJE.origen,
      nombreVisible: 'Rancho Los Pinos por medio de Arrancar',
      responderA: 'empresa@ejemplo.com',
      adjunto: null,
    });
    expect(correo?.messageId).toMatch(/^<[0-9a-f-]{36}@arrancar\.test>$/);
    expect(correo?.html).toContain('Estimado Proveedor');
  });

  it('pide el cupo con todas las direcciones antes de insertar', async () => {
    await encolar.ejecutar(operadorDePrueba(), MENSAJE);

    expect(repositorio.cuposPedidos).toEqual([['proveedor@ejemplo.com', 'empresa@ejemplo.com']]);
  });

  it('despierta al trabajador solo cuando se confirma la transacción', async () => {
    await encolar.ejecutar(operadorDePrueba(), MENSAJE);
    expect(despertares).toBe(0);

    await tareas.confirmar();

    expect(despertares).toBe(1);
  });

  it('si el «responder a» no sirve para enviar, lo omite y el pie lo dice', async () => {
    await encolar.ejecutar(operadorDePrueba(), { ...MENSAJE, responderA: 'a,b@x.com' });

    const [correo] = repositorio.insertados;
    expect(correo?.responderA).toBeNull();
    expect(correo?.texto).toContain('comuníquese con Rancho Los Pinos');
  });

  it('rechaza una dirección que no sirve antes de tocar la bandeja', async () => {
    const mensaje = { ...MENSAJE, destinatarios: [{ ...MENSAJE.destinatarios[0]!, direccion: 'x@y.com,z@w.com' }] };

    await expect(encolar.ejecutar(operadorDePrueba(), mensaje)).rejects.toThrow(DireccionNoUtilizable);
    expect(repositorio.cuposPedidos).toHaveLength(0);
    expect(repositorio.insertados).toHaveLength(0);
  });

  it('rechaza al pasarse de un tope y no inserta ni guarda el adjunto', async () => {
    repositorio.uso = { porHora: 100, porDia: 0, deLaInstalacionPorHora: 0, porDestinatario: {} };

    await expect(
      encolar.ejecutar(operadorDePrueba(), { ...MENSAJE, adjunto: { nombre: 'a.pdf', contenido: PDF } }),
    ).rejects.toThrow(CupoDeCorreosAgotado);
    expect(repositorio.insertados).toHaveLength(0);
    expect(documentos.guardados).toHaveLength(0);
  });

  it('guarda el adjunto como documento de core y lo liga al correo con su huella', async () => {
    await encolar.ejecutar(operadorDePrueba(), { ...MENSAJE, adjunto: { nombre: 'comprobante 12', contenido: PDF } });

    expect(documentos.guardados).toEqual([
      { contenido: PDF, nombre: 'comprobante 12.pdf', recursoDueno: RECURSO_DE_ADJUNTOS },
    ]);
    expect(repositorio.insertados[0]?.adjunto).toEqual({
      archivoId: 'archivo-1',
      nombre: 'comprobante 12.pdf',
      sha256: 'huella',
    });
  });

  it('rechaza un adjunto que no es PDF sin guardarlo', async () => {
    const adjunto = { nombre: 'a.pdf', contenido: Buffer.from('<html>') };

    await expect(encolar.ejecutar(operadorDePrueba(), { ...MENSAJE, adjunto })).rejects.toThrow(AdjuntoNoValido);
    expect(documentos.guardados).toHaveLength(0);
  });

  it('rechaza lo que el almacén reconoce como otra cosa que un PDF', async () => {
    documentos.tipoMime = 'image/jpeg';

    await expect(
      encolar.ejecutar(operadorDePrueba(), { ...MENSAJE, adjunto: { nombre: 'a.pdf', contenido: PDF } }),
    ).rejects.toThrow(AdjuntoNoValido);
    expect(repositorio.insertados).toHaveLength(0);
  });
});

describe('BandejaDeSalidaDeCore', () => {
  it('es el puerto público: encolar delega en el caso de uso', async () => {
    const bandeja = new BandejaDeSalidaDeCore(encolar);

    const dto = await bandeja.encolar(operadorDePrueba(), MENSAJE);

    expect(dto.id).toBe('correo-1');
  });
});
