from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ImportPreviewRequest(BaseModel):
    account_id: str
    csv_content: str
    broker_source: str = "generic"


class ImportPreviewResponse(BaseModel):
    delimiter: str
    headers: List[str]
    sample_rows: List[List[str]]
    suggested_mapping: Dict[str, Optional[str]]
    canonical_fields: Dict[str, Any]


class ImportValidateRequest(BaseModel):
    account_id: str
    csv_content: str
    column_mapping: Dict[str, str]
    broker_source: str = "generic"


class ImportValidateResponse(BaseModel):
    total_rows: int
    valid_rows_count: int
    duplicate_rows_count: int
    error_rows_count: int
    duplicates: List[Dict[str, Any]]
    errors: List[Dict[str, Any]]
    sample_valid_trades: List[Dict[str, Any]]


class ImportConfirmRequest(BaseModel):
    account_id: str
    csv_content: str
    column_mapping: Dict[str, str]
    broker_source: str = "generic"
    filename: str = "trades.csv"
    skip_duplicates: bool = True


class ImportConfirmResponse(BaseModel):
    job_id: str
    status: str
    total_rows: int
    imported_rows: int
    skipped_rows: int
    error_rows: int
    message: str


class ImportJobResponse(BaseModel):
    id: str
    account_id: str
    filename: str
    broker_source: str
    status: str
    total_rows: int
    imported_rows: int
    skipped_rows: int
    error_rows: int
    created_at: str
    summary: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}
