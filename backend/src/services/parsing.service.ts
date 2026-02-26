/**
 * Parsing Service — calls the Python Docling extraction microservice.
 *
 * Instead of using basic Node.js libraries (pdf-parse, officeparser) that
 * produce flat text dumps, we delegate extraction to a Python FastAPI
 * microservice powered by Docling (IBM). Docling provides:
 *
 * - AI-powered layout analysis (DocLayNet model)
 * - Table structure reconstruction (TableFormer)
 * - OCR for scanned PDFs (EasyOCR)
 * - Multi-format support (PDF, DOCX, PPTX, images)
 * - Structured Markdown output with sections, headings, and tables preserved
 *
 * This dramatically improves downstream LLM extraction quality because the
 * Gemini model receives well-structured markdown with clear section boundaries
 * rather than a flat text dump.
 */

import { env } from '../config/env.js';

const EXTRACTION_SERVICE_URL = env.EXTRACTION_SERVICE_URL;

export interface ExtractionSection {
  heading: string;
  level: number;
  content: string;
}

export interface ExtractionTable {
  caption: string | null;
  markdown: string;
  rows: number;
  cols: number;
}

export interface ExtractionMetadata {
  pages: number;
  fileName: string;
  fileType: string;
  extractionTimeMs: number;
  hasTables: boolean;
  hasImages: boolean;
  ocrUsed: boolean;
}

export interface ExtractionResult {
  markdown: string;
  text: string;
  sections: ExtractionSection[];
  tables: ExtractionTable[];
  metadata: ExtractionMetadata;
}

/**
 * Extract structured content from a resume file using the Docling microservice.
 *
 * Returns structured markdown, plain text, detected sections, tables, and metadata.
 * The markdown output is ideal for feeding into the Gemini LLM for field extraction
 * because it preserves document structure (headings, sections, tables).
 */
export async function extractDocument(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ExtractionResult> {
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append('file', blob, fileName);

  const response = await fetch(`${EXTRACTION_SERVICE_URL}/extract?enable_ocr=true`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Extraction service error (${response.status}): ${error}`);
  }

  const data = await response.json() as {
    markdown: string;
    text: string;
    sections: { heading: string; level: number; content: string }[];
    tables: { caption: string | null; markdown: string; rows: number; cols: number }[];
    metadata: {
      pages: number;
      file_name: string;
      file_type: string;
      extraction_time_ms: number;
      has_tables: boolean;
      has_images: boolean;
      ocr_used: boolean;
    };
  };

  return {
    markdown: data.markdown,
    text: data.text,
    sections: data.sections,
    tables: data.tables,
    metadata: {
      pages: data.metadata.pages,
      fileName: data.metadata.file_name,
      fileType: data.metadata.file_type,
      extractionTimeMs: data.metadata.extraction_time_ms,
      hasTables: data.metadata.has_tables,
      hasImages: data.metadata.has_images,
      ocrUsed: data.metadata.ocr_used,
    },
  };
}

/**
 * Legacy function — extracts plain text only.
 * Uses the Docling microservice but returns only the text field.
 * Kept for backward compatibility.
 */
export async function extractText(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const result = await extractDocument(buffer, fileName, mimeType);
  return result.text;
}

/**
 * Check if the extraction service is healthy.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${EXTRACTION_SERVICE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
