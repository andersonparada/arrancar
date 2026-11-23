import { beforeEach, describe, expect, it } from 'vitest';
import { RecursoNoEncontrado } from '../../../../core/compartido/aplicacion/errores.js';
import { BajaAnulada, BajaInvalida } from '../../../dominio/errores-de-baja.js';
import { DocumentoDeBajaInexistente } from '../../errores-de-documentos-de-baja.js';
import { armarBajas, solicitudDeBaja, type EscenarioDeBajas } from '../../../pruebas/escenario-de-bajas.soporte.js';

let e: EscenarioDeBajas;

beforeEach(() => {
  e = armarBajas();
});

const codigos = (avisos: { codigo: string }[]) => avisos.map((aviso) => aviso.codigo);

describe('Acta y denuncia de la baja', () => {
  it('subir el acta guarda el archivo, anota su tipo y quita el aviso de que falta', async () => {
    const camioneta = await e.activoEnUso();
    const baja = await e.darDeBaja(solicitudDeBaja(camioneta));

    const conActa = await e.subirActa(baja.id, 'notarial');

    expect(conActa).toMatchObject({ tieneActa: true, tipoDeActa: 'notarial' });
    expect(codigos(conActa.avisos)).not.toContain('sin_acta');
    expect(e.documentos.guardados.size).toBe(1);
    expect([...e.documentos.guardados.values()][0]!.recursoDueno).toBe('activos-fijos.bajas');
    expect(e.documentos.revisiones).toBe(1);
  });

  it('reemplazar el acta borra el archivo anterior y la auditoría lo deja como estaba', async () => {
    const camioneta = await e.activoEnUso();
    const baja = await e.darDeBaja(solicitudDeBaja(camioneta));
    await e.subirActa(baja.id, 'administrativa');
    const primero = [...e.documentos.guardados.keys()][0]!;

    const conOtra = await e.subirActa(baja.id, 'notarial');

    expect(conOtra.tipoDeActa).toBe('notarial');
    expect(e.documentos.guardados.has(primero)).toBe(false);
    expect(e.documentos.guardados.size).toBe(1);
    expect(e.auditoria.entradas).toMatchObject([
      { accion: 'adjuntar', anterior: { documento: 'acta', habiaArchivo: false, tipoDeActa: null } },
      { accion: 'adjuntar', anterior: { documento: 'acta', habiaArchivo: true, tipoDeActa: 'administrativa' } },
    ]);
  });

  it('la denuncia quita el aviso de robo sin denuncia', async () => {
    const camioneta = await e.activoEnUso();
    const baja = await e.darDeBaja(solicitudDeBaja(camioneta, { causa: 'robo' }));
    expect(codigos(baja.avisos)).toContain('sin_denuncia');

    const conDenuncia = await e.subirDenuncia(baja.id);

    expect(conDenuncia.tieneDenuncia).toBe(true);
    expect(codigos(conDenuncia.avisos)).toEqual(['sin_acta']);
  });

  it('abre el acta y la denuncia subidas; sin ellas, no existen', async () => {
    const camioneta = await e.activoEnUso();
    const baja = await e.darDeBaja(solicitudDeBaja(camioneta));
    await expect(e.abrirActa(baja.id)).rejects.toBeInstanceOf(DocumentoDeBajaInexistente);
    await expect(e.abrirDenuncia(baja.id)).rejects.toBeInstanceOf(DocumentoDeBajaInexistente);

    await e.subirActa(baja.id);
    const acta = await e.abrirActa(baja.id);

    expect(acta).toMatchObject({ nombre: 'acta-de-baja.pdf', tipoMime: 'application/pdf' });
    await expect(e.abrirActa('99999999-9999-4999-8999-999999999999')).rejects.toBeInstanceOf(RecursoNoEncontrado);
  });

  it('una baja anulada no admite documentos y qpdf ni se llama; una inexistente, tampoco', async () => {
    const camioneta = await e.activoEnUso();
    const baja = await e.darDeBaja(solicitudDeBaja(camioneta));
    await e.anular(baja.id);

    await expect(e.subirActa(baja.id)).rejects.toBeInstanceOf(BajaAnulada);
    await expect(e.subirDenuncia(baja.id)).rejects.toBeInstanceOf(BajaAnulada);
    await expect(e.subirActa('99999999-9999-4999-8999-999999999999')).rejects.toBeInstanceOf(RecursoNoEncontrado);
    expect(e.documentos.revisiones).toBe(0);
  });

  it('si el archivo no se acepta, la baja queda como estaba', async () => {
    const camioneta = await e.activoEnUso();
    const baja = await e.darDeBaja(solicitudDeBaja(camioneta));
    e.documentos.errorAlRevisar = new BajaInvalida('archivo dañado');

    await expect(e.subirActa(baja.id)).rejects.toBeInstanceOf(BajaInvalida);

    expect(e.documentos.guardados.size).toBe(0);
    expect((await e.bajas.obtener(baja.id)).tieneActa).toBe(false);
    expect(e.auditoria.entradas).toHaveLength(0);
  });
});
