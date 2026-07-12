// src/lib/reports/export.ts
// Motor único e reutilizável de exportação. Recebe dados já formatados para
// exibição (strings prontas, "R$ 1.234,56" etc.) — não faz nenhuma conversão
// de domínio, só serializa.

import ExcelJS from "exceljs";

export type ExportColumn = { key: string; header: string };

export async function generateExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Relatório");

  sheet.columns = columns.map((col) => ({ key: col.key, header: col.header }));
  sheet.getRow(1).font = { bold: true };

  for (const row of data) {
    sheet.addRow(columns.map((col) => row[col.key] ?? ""));
  }

  for (const [i, col] of columns.entries()) {
    const maiorConteudo = data.reduce((max, row) => {
      const valor = String(row[col.key] ?? "");
      return Math.max(max, valor.length);
    }, col.header.length);
    sheet.getColumn(i + 1).width = Math.min(60, Math.max(10, maiorConteudo + 2));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function escaparCampoCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  if (texto.includes(";") || texto.includes("\n") || texto.includes('"')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

const BOM_UTF8 = String.fromCharCode(0xfeff);

export function generateCsv(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
): string {
  const linhas = [
    columns.map((col) => escaparCampoCsv(col.header)).join(";"),
    ...data.map((row) =>
      columns.map((col) => escaparCampoCsv(row[col.key])).join(";"),
    ),
  ];
  return BOM_UTF8 + linhas.join("\r\n");
}
