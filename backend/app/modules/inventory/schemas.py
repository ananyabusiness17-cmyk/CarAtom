from datetime import datetime

from pydantic import BaseModel, Field


class SkuStockOut(BaseModel):
    id: str
    sku_code: str
    name: str
    oem_code: str | None = None
    unit: str
    stock_by_location: dict[str, int]
    total_quantity: int
    low_stock_threshold: int
    is_low_stock: bool
    is_active: bool = True


class SkuListResponse(BaseModel):
    items: list[SkuStockOut]
    next_cursor: str | None = None
    low_stock_count: int = 0


class CreateSkuRequest(BaseModel):
    sku_code: str = Field(..., min_length=2, max_length=40)
    name: str = Field(..., min_length=1, max_length=120)
    oem_code: str | None = None
    unit: str = "each"
    low_stock_threshold: int = Field(5, ge=0, le=10000)


class PatchSkuRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    oem_code: str | None = None
    low_stock_threshold: int | None = Field(None, ge=0, le=10000)
    is_active: bool | None = None


class MovementRequest(BaseModel):
    movement_type: str
    sku_id: str
    location_code: str
    quantity: int = Field(..., ge=1)
    reason: str = Field(..., min_length=1)
    reference: str | None = None
    to_location_code: str | None = None
    job_card_id: str | None = None
    visit_id: str | None = None
    job_part_id: str | None = None
    adjust_delta: int = Field(1, description="1 to increase, -1 to decrease for ADJUST")


class MovementResponse(BaseModel):
    movement_id: str
    sku_id: str
    stock_by_location: dict[str, int]
    total_quantity: int
    audit_id: str


class StockLocationOut(BaseModel):
    location_code: str
    quantity: int


class SkuDetailOut(BaseModel):
    sku: SkuStockOut
    stock: list[StockLocationOut]
    movements: list["MovementRowOut"]
    next_cursor: str | None = None


class MovementRowOut(BaseModel):
    id: str
    movement_type: str
    location_code: str
    quantity: int
    reason: str
    reference: str | None = None
    created_at: datetime
    job_card_id: str | None = None


class JobUsageLineOut(BaseModel):
    sku_code: str
    sku_name: str
    quantity: float
    visit_label: str
    visit_id: str | None = None
    job_part_id: str


class JobUsageResponse(BaseModel):
    job_card_id: str
    job_card_ref: str
    customer_name: str | None = None
    vehicle_summary: str | None = None
    technician_name: str | None = None
    items: list[JobUsageLineOut]


class PartsHistoryJobOut(BaseModel):
    job_card_id: str
    job_card_ref: str
    sku_labels: str
    completed_at: datetime | None = None


class PartsHistoryVehicleOut(BaseModel):
    vehicle_id: str | None = None
    vehicle_label: str
    jobs: list[PartsHistoryJobOut]


class PartsHistoryResponse(BaseModel):
    customer_id: str
    customer_name: str | None = None
    vehicles: list[PartsHistoryVehicleOut]


SkuDetailOut.model_rebuild()
