"""
ResumeAI Extraction Service — Python FastAPI microservice powered by Docling (IBM).

Provides high-quality document extraction with:
- AI-powered layout analysis (DocLayNet model)
- Table structure reconstruction (TableFormer)
- OCR for scanned PDFs (EasyOCR / Tesseract)
- Multi-format support (PDF, DOCX, PPTX, images)
- Structured Markdown + JSON output

Architecture:
  Node.js Backend (BullMQ Worker) → HTTP POST /extract → This service → Structured output
  Runs on same VM as Node.js backend, port 8100
"""

import io
import os
import time
import logging
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Docling imports
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import (
    PdfPipelineOptions,
    TableFormerMode,
    EasyOcrOptions,
    OcrOptions,
    OcrMac,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("extraction-service")

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="ResumeAI Extraction Service",
    description="Docling-powered document extraction microservice",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Docling converter — singleton, initialised once at startup
# ---------------------------------------------------------------------------
_converter: Optional[DocumentConverter] = None


def get_converter() -> DocumentConverter:
    """Lazy-init the Docling converter (downloads models on first call)."""
    global _converter
    if _converter is None:
        logger.info("Initialising Docling DocumentConverter (first run downloads models)...")

        # Configure PDF pipeline with table extraction and OCR
        pdf_pipeline_options = PdfPipelineOptions(
            do_table_structure=True,
            table_structure_options=TableFormerMode.ACCURATE,
        )

        # Enable OCR for scanned documents
        ocr_enabled = os.getenv("ENABLE_OCR", "true").lower() == "true"
        if ocr_enabled:
            pdf_pipeline_options.do_ocr = True
            pdf_pipeline_options.ocr_options = EasyOcrOptions(
                lang=["en"],
            )

        _converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(
                    pipeline_options=pdf_pipeline_options,
                ),
            },
        )
        logger.info("Docling DocumentConverter initialised.")
    return _converter


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------
class SectionInfo(BaseModel):
    heading: str
    level: int
    content: str


class TableInfo(BaseModel):
    caption: Optional[str] = None
    markdown: str
    rows: int
    cols: int


class ExtractionMetadata(BaseModel):
    pages: int
    file_name: str
    file_type: str
    extraction_time_ms: int
    has_tables: bool
    has_images: bool
    ocr_used: bool


class ExtractionResult(BaseModel):
    markdown: str
    text: str
    sections: list[SectionInfo]
    tables: list[TableInfo]
    metadata: ExtractionMetadata


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def extract_sections(markdown_text: str) -> list[SectionInfo]:
    """Parse markdown headings into section objects."""
    sections: list[SectionInfo] = []
    current_heading = ""
    current_level = 0
    current_content_lines: list[str] = []

    for line in markdown_text.split("\n"):
        stripped = line.strip()
        if stripped.startswith("#"):
            # Save previous section
            if current_heading:
                sections.append(SectionInfo(
                    heading=current_heading,
                    level=current_level,
                    content="\n".join(current_content_lines).strip(),
                ))

            # Parse heading level
            level = 0
            for ch in stripped:
                if ch == "#":
                    level += 1
                else:
                    break
            current_heading = stripped.lstrip("#").strip()
            current_level = level
            current_content_lines = []
        else:
            current_content_lines.append(line)

    # Last section
    if current_heading:
        sections.append(SectionInfo(
            heading=current_heading,
            level=current_level,
            content="\n".join(current_content_lines).strip(),
        ))

    return sections


def extract_tables_from_doc(doc) -> list[TableInfo]:
    """Extract tables from a Docling document object."""
    tables: list[TableInfo] = []
    try:
        for table in doc.tables:
            md = table.export_to_markdown()
            # Count rows and cols from markdown table
            lines = [l for l in md.strip().split("\n") if l.strip() and not l.strip().startswith("---")]
            rows = len(lines)
            cols = len(lines[0].split("|")) - 2 if lines else 0  # subtract leading/trailing |
            tables.append(TableInfo(
                caption=getattr(table, "caption", None),
                markdown=md,
                rows=max(rows, 0),
                cols=max(cols, 0),
            ))
    except Exception as e:
        logger.warning(f"Table extraction warning: {e}")
    return tables


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "service": "extraction-service", "engine": "docling"}


@app.post("/extract", response_model=ExtractionResult)
async def extract_document(
    file: UploadFile = File(...),
    enable_ocr: bool = Query(default=True, description="Enable OCR for scanned documents"),
):
    """
    Extract structured content from a resume/document.

    Accepts PDF, DOCX, PPTX, and image files.
    Returns structured Markdown, plain text, sections, tables, and metadata.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Validate file type
    allowed_types = {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "image/png",
        "image/jpeg",
        "image/tiff",
    }
    if file.content_type and file.content_type not in allowed_types:
        # Also allow by extension
        ext = Path(file.filename).suffix.lower()
        allowed_exts = {".pdf", ".doc", ".docx", ".pptx", ".png", ".jpg", ".jpeg", ".tiff"}
        if ext not in allowed_exts:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type} ({ext})",
            )

    start_time = time.time()

    # Write uploaded file to temp location (Docling needs a file path)
    content = await file.read()
    suffix = Path(file.filename).suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        converter = get_converter()
        result = converter.convert(tmp_path)
        doc = result.document

        # Export to markdown and plain text
        markdown_output = doc.export_to_markdown()
        text_output = doc.export_to_text() if hasattr(doc, "export_to_text") else markdown_output

        # Extract sections from markdown
        sections = extract_sections(markdown_output)

        # Extract tables
        tables = extract_tables_from_doc(doc)

        # Determine page count
        page_count = 0
        try:
            if hasattr(doc, "pages"):
                page_count = len(doc.pages)
            elif hasattr(result, "pages"):
                page_count = len(result.pages)
        except Exception:
            page_count = 1

        extraction_time_ms = int((time.time() - start_time) * 1000)

        # Determine file type
        ext = Path(file.filename).suffix.lower()
        file_type_map = {
            ".pdf": "pdf",
            ".doc": "doc",
            ".docx": "docx",
            ".pptx": "pptx",
            ".png": "image",
            ".jpg": "image",
            ".jpeg": "image",
            ".tiff": "image",
        }
        file_type = file_type_map.get(ext, "unknown")

        logger.info(
            f"Extracted {file.filename}: {len(markdown_output)} chars, "
            f"{len(sections)} sections, {len(tables)} tables, "
            f"{extraction_time_ms}ms"
        )

        return ExtractionResult(
            markdown=markdown_output,
            text=text_output,
            sections=sections,
            tables=tables,
            metadata=ExtractionMetadata(
                pages=page_count,
                file_name=file.filename,
                file_type=file_type,
                extraction_time_ms=extraction_time_ms,
                has_tables=len(tables) > 0,
                has_images=False,  # Could be enhanced
                ocr_used=enable_ocr,
            ),
        )

    except Exception as e:
        logger.error(f"Extraction failed for {file.filename}: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


@app.post("/extract/batch")
async def extract_batch(
    files: list[UploadFile] = File(...),
):
    """Extract multiple documents in a single request."""
    results = []
    for f in files:
        try:
            result = await extract_document(file=f)
            results.append({"file_name": f.filename, "status": "success", "data": result})
        except HTTPException as e:
            results.append({"file_name": f.filename, "status": "failed", "error": e.detail})
        except Exception as e:
            results.append({"file_name": f.filename, "status": "failed", "error": str(e)})
    return {"results": results}


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------
@app.on_event("startup")
async def startup_event():
    """Pre-warm the Docling converter so first request isn't slow."""
    logger.info("Pre-warming Docling converter...")
    try:
        get_converter()
        logger.info("Docling converter ready.")
    except Exception as e:
        logger.warning(f"Docling pre-warm failed (will retry on first request): {e}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("EXTRACTION_PORT", "8100"))
    uvicorn.run(app, host="0.0.0.0", port=port)
