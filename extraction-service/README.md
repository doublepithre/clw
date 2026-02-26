# Extraction Service — Docling-powered document extraction

## Quick Start

### Local (direct)
```bash
cd extraction-service
pip install -r requirements.txt
python main.py
# → Runs on http://localhost:8100
```

### Docker
```bash
docker build -t resumeai-extraction .
docker run -p 8100:8100 resumeai-extraction
```

## API

### Health Check
```
GET /health
```

### Extract Document
```
POST /extract
Content-Type: multipart/form-data
Body: file=<resume.pdf>
Query: ?enable_ocr=true

Response:
{
  "markdown": "# John Doe\n## Experience\n...",
  "text": "John Doe\nExperience\n...",
  "sections": [
    { "heading": "John Doe", "level": 1, "content": "..." },
    { "heading": "Experience", "level": 2, "content": "..." }
  ],
  "tables": [
    { "caption": null, "markdown": "| Skill | Years |\n...", "rows": 5, "cols": 2 }
  ],
  "metadata": {
    "pages": 2,
    "file_name": "resume.pdf",
    "file_type": "pdf",
    "extraction_time_ms": 1200,
    "has_tables": true,
    "has_images": false,
    "ocr_used": true
  }
}
```

### Batch Extract
```
POST /extract/batch
Content-Type: multipart/form-data
Body: files=<resume1.pdf>&files=<resume2.docx>
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `EXTRACTION_PORT` | `8100` | Port to listen on |
| `ENABLE_OCR` | `true` | Enable OCR for scanned documents |

## Why Docling?

- **Layout Analysis**: AI-powered DocLayNet model identifies headings, paragraphs, tables, figures
- **Table Extraction**: TableFormer model reconstructs table structure accurately
- **OCR**: Built-in support for scanned PDFs via EasyOCR/Tesseract
- **Multi-format**: PDF, DOCX, PPTX, images — all natively supported
- **Structured Output**: Markdown with sections preserved → better LLM extraction downstream
