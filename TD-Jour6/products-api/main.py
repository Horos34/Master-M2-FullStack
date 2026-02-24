from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import jwt

app = FastAPI(title="Products API", version="1.0.0")
security = HTTPBearer()

# CORS pour gateway
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

JWT_SECRET = "supersecretkey-changeinprod"  # Même clé que auth-service
ALGORITHM = "HS256"

# Modèles Pydantic
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., max_length=500)
    price: float = Field(..., gt=0)
    stock: int = Field(..., ge=0)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    price: Optional[float] = Field(None, gt=0)
    stock: Optional[int] = Field(None, ge=0)

class ProductResponse(ProductBase):
    id: int
    created_by: int

    class Config:
        from_attributes = True

# Stockage mémoire
products_db = [
    {"id": 1, "name": "Widget A", "description": "Super widget", "price": 9.99, "stock": 100, "created_by": 1},
    {"id": 2, "name": "Widget B", "description": "Widget premium", "price": 24.99, "stock": 50, "created_by": 1}
]
next_id = 3

# JWT Verification
def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[ALGORITHM])
        return payload
    except:
        raise HTTPException(status_code=401, detail="Token invalide")

# Health check (public)
@app.get("/health")
async def health():
    return {"status": "ok", "products_count": len(products_db)}

# GET /products (public - avec filtres)
@app.get("/products", response_model=List[ProductResponse])
async def get_products(
    name: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None
):
    filtered = products_db
    if name:
        filtered = [p for p in filtered if name.lower() in p["name"].lower()]
    if min_price:
        filtered = [p for p in filtered if p["price"] >= min_price]
    if max_price:
        filtered = [p for p in filtered if p["price"] <= max_price]
    
    return filtered

# GET /products/{id} (public)
@app.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int):
    product = next((p for p in products_db if p["id"] == product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    return product

# Routes protégées CRUD
@app.post("/products", response_model=ProductResponse, status_code=201)
async def create_product(product: ProductCreate, user: dict = Depends(verify_token)):
    global next_id
    new_product = product.dict()
    new_product["id"] = next_id
    new_product["created_by"] = user["userId"]
    products_db.append(new_product)
    next_id += 1
    return new_product

@app.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product: ProductUpdate,
    user: dict = Depends(verify_token)
):
    product_data = next((p for p in products_db if p["id"] == product_id), None)
    if not product_data:
        raise HTTPException(status_code=404, detail="Produit non trouvé")
    
    update_data = product.dict(exclude_unset=True)
    update_data["updated_by"] = user["userId"]
    for field, value in update_data.items():
        product_data[field] = value
    
    return product_data

@app.delete("/products/{product_id}", status_code=204)
async def delete_product(product_id: int, user: dict = Depends(verify_token)):
    global products_db
    products_db = [p for p in products_db if p["id"] != product_id]
