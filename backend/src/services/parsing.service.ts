import pdfParse from 'pdf-parse';
import officeparser from 'officeparser';

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractPdfText(buffer);
  }

  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractDocxText(buffer);
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text.trim();
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const text = await officeparser.parseOfficeAsync(buffer);
  return text.trim();
}
