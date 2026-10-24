import uuid
from typing import List

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.importers.generic_csv import generate_canonical_template_csv
from app.models.user import User
from app.schemas.import_job import (
    ImportConfirmRequest,
    ImportConfirmResponse,
    ImportJobResponse,
    ImportPreviewRequest,
    ImportPreviewResponse,
    ImportValidateRequest,
    ImportValidateResponse,
)
from app.services.import_service import ImportService

router = APIRouter()


@router.post("/preview", response_model=ImportPreviewResponse)
async def preview_csv(
    data: ImportPreviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ImportService(db)
    return service.preview(csv_content=data.csv_content, broker_source=data.broker_source)


@router.post("/validate", response_model=ImportValidateResponse)
async def validate_import(
    data: ImportValidateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ImportService(db)
    return await service.validate(
        user_id=current_user.id,
        account_id=uuid.UUID(data.account_id),
        csv_content=data.csv_content,
        column_mapping=data.column_mapping,
        broker_source=data.broker_source,
    )


@router.post("/confirm", response_model=ImportConfirmResponse)
async def confirm_import(
    data: ImportConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ImportService(db)
    job = await service.confirm(
        user_id=current_user.id,
        account_id=uuid.UUID(data.account_id),
        csv_content=data.csv_content,
        column_mapping=data.column_mapping,
        filename=data.filename,
        broker_source=data.broker_source,
        skip_duplicates=data.skip_duplicates,
    )
    return ImportConfirmResponse(
        job_id=str(job.id),
        status=job.status,
        total_rows=job.total_rows,
        imported_rows=job.imported_rows,
        skipped_rows=job.skipped_rows,
        error_rows=job.error_rows,
        message=f"Successfully imported {job.imported_rows} trades. {job.skipped_rows} duplicates skipped, {job.error_rows} errors.",
    )


@router.get("/template/download")
async def download_template():
    csv_text = generate_canonical_template_csv()
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mytradejournal_template.csv"},
    )


@router.get("", response_model=List[ImportJobResponse])
async def list_import_jobs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ImportService(db)
    jobs = await service.list_jobs(current_user.id)
    return [
        ImportJobResponse(
            id=str(j.id),
            account_id=str(j.account_id),
            filename=j.filename,
            broker_source=j.broker_source,
            status=j.status,
            total_rows=j.total_rows,
            imported_rows=j.imported_rows,
            skipped_rows=j.skipped_rows,
            error_rows=j.error_rows,
            created_at=j.created_at.isoformat(),
            summary=j.summary,
        )
        for j in jobs
    ]


@router.get("/{job_id}", response_model=ImportJobResponse)
async def get_import_job(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = ImportService(db)
    j = await service.get_job(job_id, current_user.id)
    return ImportJobResponse(
        id=str(j.id),
        account_id=str(j.account_id),
        filename=j.filename,
        broker_source=j.broker_source,
        status=j.status,
        total_rows=j.total_rows,
        imported_rows=j.imported_rows,
        skipped_rows=j.skipped_rows,
        error_rows=j.error_rows,
        created_at=j.created_at.isoformat(),
        summary=j.summary,
    )
