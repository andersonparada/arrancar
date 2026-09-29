interface PartesDelPdf {
  /** Entradas extra del catálogo (`/OpenAction`, `/Names`, `/AcroForm`…). */
  catalogo?: string;
  /** Entradas extra de la página (`/Annots`, `/AA`…). */
  pagina?: string;
  /** Objetos extra, ya escritos («4 0 obj … endobj»). */
  objetos?: string[];
  /** Número de páginas; por omisión, una. */
  paginas?: number;
}

/**
 * Un PDF escrito como texto, sin tabla de referencias: qpdf lo reconstruye (sale con avisos), que es
 * justo lo que hace el inspector al normalizarlo. Los objetos extra empiezan en el número 100.
 */
export function pdfDePrueba({ catalogo = '', pagina = '', objetos = [], paginas = 1 }: PartesDelPdf = {}): Buffer {
  const hojas = Array.from({ length: paginas }, (_, i) => 3 + i);
  const referencias = hojas.map((numero) => `${numero} 0 R`).join(' ');
  const partes = [
    '%PDF-1.7',
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R ${catalogo} >>\nendobj`,
    `2 0 obj\n<< /Type /Pages /Kids [${referencias}] /Count ${paginas} >>\nendobj`,
    ...hojas.map(
      (numero) => `${numero} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] ${pagina} >>\nendobj`,
    ),
    ...objetos,
    `trailer\n<< /Root 1 0 R /Size ${3 + paginas} >>\n%%EOF\n`,
  ];
  return Buffer.from(partes.join('\n'), 'latin1');
}

/** Un objeto de PDF (sin flujo) para pasar en `objetos`. */
export function objetoDePdf(numero: number, contenido: string): string {
  return `${numero} 0 obj\n${contenido}\nendobj`;
}
