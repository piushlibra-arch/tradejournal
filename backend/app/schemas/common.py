from typing import Optional

from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str
    detail: Optional[str] = None


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 50
