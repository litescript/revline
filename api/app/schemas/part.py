from pydantic import BaseModel


class PartBase(BaseModel):
    sku: str
    description: str
    list_price: float


class PartCreate(PartBase):
    pass


class PartOut(PartBase):
    id: int

    class Config:
        from_attributes = True
