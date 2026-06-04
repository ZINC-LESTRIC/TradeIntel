from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Header, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import base64
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from collections import defaultdict

ROOT_DIR = Path(__file__).parent

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com').lower()
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'admin123')
JWT_ALG = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============== AUTH HELPERS ==============
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=14),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired, please sign in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("banned"):
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact admin.")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ============== MODELS ==============
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TradeRecordIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    exporter_name: str = ""
    exporter_company: str = ""
    exporter_address: str = ""
    exporter_country: str = "Pakistan"
    buyer_name: str = ""
    buyer_company: str = ""
    buyer_address: str = ""
    buyer_country: str = ""
    buyer_city: str = ""
    buyer_email: str = ""
    product_name: str = ""
    product_category: str = ""
    unit_price: float = 0.0
    currency: str = "USD"
    quantity: float = 0.0
    unit: str = "pcs"
    total_value: float = 0.0
    gross_weight_kg: float = 0.0
    cartons: float = 0.0
    shipment_date: str = ""
    gd_number: str = ""
    invoice_number: str = ""
    notes: str = ""


class TradeRecord(TradeRecordIn):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ============== STARTUP: seed admin + indexes ==============
@app.on_event("startup")
async def on_startup():
    try:
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logging.warning(f"Index create skipped: {e}")
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "name": "Admin",
            "role": "admin",
            "banned": False,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_login": None,
        })
        logging.info(f"Seeded admin: {ADMIN_EMAIL}")
    else:
        # Keep admin password in sync with env if changed
        if not verify_password(ADMIN_PASSWORD, existing.get("password_hash", "")):
            await db.users.update_one(
                {"email": ADMIN_EMAIL},
                {"$set": {"password_hash": hash_password(ADMIN_PASSWORD), "role": "admin", "banned": False}},
            )
            logging.info(f"Updated admin password for: {ADMIN_EMAIL}")


# ============== AUTH ENDPOINTS ==============
def _user_view(u: dict) -> dict:
    return {k: v for k, v in u.items() if k not in ("password_hash", "_id")}


@api_router.post("/auth/register")
async def register(payload: RegisterRequest):
    email = payload.email.lower().strip()
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account already exists with this email")
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": (payload.name or email.split("@")[0]).strip(),
        "role": "viewer",
        "banned": False,
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user["id"], user["email"], user["role"])
    return {"token": token, "user": _user_view(user)}


@api_router.post("/auth/login")
async def login(payload: LoginRequest):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("banned"):
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact admin.")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}},
    )
    token = create_token(user["id"], user["email"], user["role"])
    user["last_login"] = datetime.now(timezone.utc).isoformat()
    return {"token": token, "user": _user_view(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ============== RECORDS CRUD ==============
@api_router.post("/records", response_model=TradeRecord)
async def create_record(payload: TradeRecordIn, _: dict = Depends(require_admin)):
    rec = TradeRecord(**payload.model_dump())
    if not rec.total_value and rec.unit_price and rec.quantity:
        rec.total_value = round(rec.unit_price * rec.quantity, 2)
    await db.records.insert_one(rec.model_dump())
    return rec


@api_router.get("/records", response_model=List[TradeRecord])
async def list_records(
    q: Optional[str] = None,
    country: Optional[str] = None,
    buyer: Optional[str] = None,
    exporter: Optional[str] = None,
    product: Optional[str] = None,
    _: dict = Depends(get_current_user),
):
    import re
    and_clauses = []
    if q:
        qe = re.escape(q)
        and_clauses.append({"$or": [
            {"product_name": {"$regex": qe, "$options": "i"}},
            {"product_category": {"$regex": qe, "$options": "i"}},
            {"buyer_name": {"$regex": qe, "$options": "i"}},
            {"buyer_company": {"$regex": qe, "$options": "i"}},
            {"exporter_name": {"$regex": qe, "$options": "i"}},
            {"exporter_company": {"$regex": qe, "$options": "i"}},
            {"buyer_country": {"$regex": qe, "$options": "i"}},
            {"buyer_city": {"$regex": qe, "$options": "i"}},
            {"notes": {"$regex": qe, "$options": "i"}},
        ]})
    if country:
        and_clauses.append({"buyer_country": {"$regex": f"^{re.escape(country)}$", "$options": "i"}})
    if buyer:
        and_clauses.append({"buyer_company": {"$regex": f"^{re.escape(buyer)}$", "$options": "i"}})
    if exporter:
        and_clauses.append({"exporter_company": {"$regex": f"^{re.escape(exporter)}$", "$options": "i"}})
    if product:
        and_clauses.append({"product_name": {"$regex": re.escape(product), "$options": "i"}})
    filt: Dict[str, Any] = {"$and": and_clauses} if and_clauses else {}
    docs = await db.records.find(filt, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return docs


@api_router.get("/records/{record_id}", response_model=TradeRecord)
async def get_record(record_id: str, _: dict = Depends(get_current_user)):
    doc = await db.records.find_one({"id": record_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Record not found")
    return doc


@api_router.put("/records/{record_id}", response_model=TradeRecord)
async def update_record(record_id: str, payload: TradeRecordIn, _: dict = Depends(require_admin)):
    existing = await db.records.find_one({"id": record_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Record not found")
    update = payload.model_dump()
    if not update.get("total_value") and update.get("unit_price") and update.get("quantity"):
        update["total_value"] = round(update["unit_price"] * update["quantity"], 2)
    await db.records.update_one({"id": record_id}, {"$set": update})
    return {**existing, **update}


@api_router.delete("/records/{record_id}")
async def delete_record(record_id: str, _: dict = Depends(require_admin)):
    res = await db.records.delete_one({"id": record_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"ok": True}


# ============== STATS ==============
@api_router.get("/stats")
async def stats(_: dict = Depends(get_current_user)):
    docs = await db.records.find({}, {"_id": 0}).to_list(5000)
    products = {d.get("product_name", "").strip() for d in docs if d.get("product_name")}
    buyers = {d.get("buyer_company", "").strip() for d in docs if d.get("buyer_company")}
    exporters = {d.get("exporter_company", "").strip() for d in docs if d.get("exporter_company")}
    countries = {d.get("buyer_country", "").strip() for d in docs if d.get("buyer_country")}
    total_value = sum(float(d.get("total_value") or 0) for d in docs)

    by_country = defaultdict(lambda: {"count": 0, "value": 0.0})
    for d in docs:
        c = d.get("buyer_country") or "Unknown"
        by_country[c]["count"] += 1
        by_country[c]["value"] += float(d.get("total_value") or 0)
    top_countries = sorted(
        [{"country": k, **v} for k, v in by_country.items()],
        key=lambda x: x["value"], reverse=True,
    )[:6]

    by_product = defaultdict(lambda: {"count": 0, "value": 0.0})
    for d in docs:
        p = d.get("product_name") or "Unknown"
        by_product[p]["count"] += 1
        by_product[p]["value"] += float(d.get("total_value") or 0)
    top_products = sorted(
        [{"product": k, **v} for k, v in by_product.items()],
        key=lambda x: x["value"], reverse=True,
    )[:6]

    recent = sorted(docs, key=lambda x: x.get("created_at", ""), reverse=True)[:5]
    return {
        "total_records": len(docs),
        "unique_products": len(products),
        "unique_buyers": len(buyers),
        "unique_exporters": len(exporters),
        "unique_countries": len(countries),
        "total_value": round(total_value, 2),
        "top_countries": top_countries,
        "top_products": top_products,
        "recent": recent,
    }


# ============== SEARCH ==============
@api_router.get("/search")
async def search(q: str, _: dict = Depends(get_current_user)):
    if not q or not q.strip():
        return {"query": q, "total": 0, "records": [], "by_country": [], "by_buyer": [], "by_exporter": []}
    import re
    qe = re.escape(q)
    filt = {"$or": [
        {"product_name": {"$regex": qe, "$options": "i"}},
        {"product_category": {"$regex": qe, "$options": "i"}},
        {"notes": {"$regex": qe, "$options": "i"}},
    ]}
    docs = await db.records.find(filt, {"_id": 0}).to_list(2000)

    def group(field: str):
        groups: Dict[str, Dict[str, Any]] = {}
        for d in docs:
            key = (d.get(field) or "Unknown").strip() or "Unknown"
            g = groups.setdefault(key, {"key": key, "count": 0, "total_value": 0.0,
                                        "min_price": None, "max_price": None, "records": []})
            g["count"] += 1
            g["total_value"] += float(d.get("total_value") or 0)
            up = float(d.get("unit_price") or 0)
            if up:
                g["min_price"] = up if g["min_price"] is None else min(g["min_price"], up)
                g["max_price"] = up if g["max_price"] is None else max(g["max_price"], up)
            g["records"].append(d)
        out = list(groups.values())
        out.sort(key=lambda x: x["total_value"], reverse=True)
        for g in out:
            g["total_value"] = round(g["total_value"], 2)
        return out

    return {
        "query": q,
        "total": len(docs),
        "records": docs,
        "by_country": group("buyer_country"),
        "by_buyer": group("buyer_company"),
        "by_exporter": group("exporter_company"),
    }


# ============== FILTERS META ==============
@api_router.get("/filters")
async def filters(_: dict = Depends(get_current_user)):
    docs = await db.records.find({}, {"_id": 0}).to_list(5000)
    def uniq(field):
        return sorted({(d.get(field) or "").strip() for d in docs if d.get(field)})
    return {
        "countries": uniq("buyer_country"),
        "buyers": uniq("buyer_company"),
        "exporters": uniq("exporter_company"),
        "products": uniq("product_name"),
        "categories": uniq("product_category"),
    }



# ============== ADMIN: USER MANAGEMENT ==============
@api_router.get("/admin/users")
async def list_users(_: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)
    return users


@api_router.post("/admin/users/{user_id}/ban")
async def ban_user(user_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot ban an admin")
    await db.users.update_one({"id": user_id}, {"$set": {"banned": True}})
    return {"ok": True}


@api_router.post("/admin/users/{user_id}/unban")
async def unban_user(user_id: str, _: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"id": user_id}, {"$set": {"banned": False}})
    return {"ok": True}


@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, _: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete an admin")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}


# ============== SEED (admin only) ==============
SAMPLE_RECORDS = [
    {"exporter_name": "Ahmed Khan", "exporter_company": "Lahore Textiles Pvt Ltd", "exporter_address": "Plot 42, Sundar Industrial Estate, Lahore, Pakistan", "exporter_country": "Pakistan", "buyer_name": "John Miller", "buyer_company": "H&M North America", "buyer_address": "110 Fifth Ave, New York, NY 10011, USA", "buyer_country": "USA", "buyer_city": "New York", "buyer_email": "j.miller@hm-buying.com", "product_name": "Cotton Casual Shirts", "product_category": "Shirts", "unit_price": 4.85, "currency": "USD", "quantity": 12000, "unit": "pcs", "shipment_date": "2025-11-10", "gd_number": "KHIP-2025-441", "invoice_number": "LTX-2025-441", "notes": "FOB Karachi, blue chambray"},
    {"exporter_name": "Bilal Sheikh", "exporter_company": "Karachi Garments Co", "exporter_address": "SITE Area, Karachi, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Emma Clarke", "buyer_company": "Primark UK Ltd", "buyer_address": "Arthur Ryan House, 22-24 Parnell St, London, UK", "buyer_country": "UK", "buyer_city": "London", "buyer_email": "emma.clarke@primark.co.uk", "product_name": "Oxford Formal Shirts", "product_category": "Shirts", "unit_price": 6.20, "currency": "GBP", "quantity": 8500, "unit": "pcs", "shipment_date": "2025-12-02", "gd_number": "KHIP-2025-3321", "invoice_number": "KGC-3321", "notes": "White, slim fit"},
    {"exporter_name": "Hassan Raza", "exporter_company": "Faisalabad Apparel House", "exporter_address": "Jhang Road, Faisalabad, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Klaus Becker", "buyer_company": "C&A Mode GmbH", "buyer_address": "Wanheimer Str 70, 40468 Düsseldorf, Germany", "buyer_country": "Germany", "buyer_city": "Düsseldorf", "buyer_email": "k.becker@c-and-a.com", "product_name": "Linen Casual Shirts", "product_category": "Shirts", "unit_price": 7.40, "currency": "EUR", "quantity": 6000, "unit": "pcs", "shipment_date": "2025-10-25", "gd_number": "LHRP-2025-7782", "invoice_number": "FAH-7782", "notes": "Off-white linen blend"},
    {"exporter_name": "Imran Ali", "exporter_company": "Lahore Textiles Pvt Ltd", "exporter_address": "Plot 42, Sundar Industrial Estate, Lahore, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Yusuf Al-Mansoori", "buyer_company": "LuLu Hypermarket", "buyer_address": "Mussafah, Abu Dhabi, UAE", "buyer_country": "UAE", "buyer_city": "Abu Dhabi", "buyer_email": "yusuf.m@lulugroup.ae", "product_name": "Cotton Casual Shirts", "product_category": "Shirts", "unit_price": 5.10, "currency": "USD", "quantity": 9500, "unit": "pcs", "shipment_date": "2025-11-18", "gd_number": "KHIP-2025-512", "invoice_number": "LTX-2025-512", "notes": "Striped, Eid order"},
    {"exporter_name": "Sana Tariq", "exporter_company": "Karachi Garments Co", "exporter_address": "SITE Area, Karachi, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Liam O'Connor", "buyer_company": "Cotton On Group", "buyer_address": "20 Hoddle St, Abbotsford VIC, Australia", "buyer_country": "Australia", "buyer_city": "Melbourne", "buyer_email": "liam@cottonon.com", "product_name": "Polo Shirts", "product_category": "Shirts", "unit_price": 5.95, "currency": "USD", "quantity": 7400, "unit": "pcs", "shipment_date": "2025-12-09", "gd_number": "KHIP-2025-3398", "invoice_number": "KGC-3398", "notes": "Pique knit, mixed colors"},
    {"exporter_name": "Ahmed Khan", "exporter_company": "Lahore Textiles Pvt Ltd", "exporter_address": "Plot 42, Sundar Industrial Estate, Lahore, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Sophie Martin", "buyer_company": "Carrefour France", "buyer_address": "93 Avenue de Paris, Massy, France", "buyer_country": "France", "buyer_city": "Paris", "buyer_email": "s.martin@carrefour.fr", "product_name": "Denim Jeans", "product_category": "Trousers", "unit_price": 8.75, "currency": "EUR", "quantity": 5500, "unit": "pcs", "shipment_date": "2025-11-22", "gd_number": "KHIP-2025-560", "invoice_number": "LTX-2025-560", "notes": "5-pocket, indigo wash"},
    {"exporter_name": "Bilal Sheikh", "exporter_company": "Karachi Garments Co", "exporter_address": "SITE Area, Karachi, Pakistan", "exporter_country": "Pakistan", "buyer_name": "John Miller", "buyer_company": "Walmart Sourcing USA", "buyer_address": "702 SW 8th St, Bentonville, AR, USA", "buyer_country": "USA", "buyer_city": "Bentonville", "buyer_email": "miller.j@wal-mart.com", "product_name": "Chino Trousers", "product_category": "Trousers", "unit_price": 6.40, "currency": "USD", "quantity": 14000, "unit": "pcs", "shipment_date": "2025-12-15", "gd_number": "KHIP-2025-3445", "invoice_number": "KGC-3445", "notes": "Khaki, beige, navy"},
    {"exporter_name": "Hassan Raza", "exporter_company": "Faisalabad Apparel House", "exporter_address": "Jhang Road, Faisalabad, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Klaus Becker", "buyer_company": "C&A Mode GmbH", "buyer_address": "Wanheimer Str 70, 40468 Düsseldorf, Germany", "buyer_country": "Germany", "buyer_city": "Düsseldorf", "buyer_email": "k.becker@c-and-a.com", "product_name": "Cargo Trousers", "product_category": "Trousers", "unit_price": 7.20, "currency": "EUR", "quantity": 4800, "unit": "pcs", "shipment_date": "2025-10-30", "gd_number": "LHRP-2025-7811", "invoice_number": "FAH-7811", "notes": "Olive green"},
    {"exporter_name": "Sana Tariq", "exporter_company": "Karachi Garments Co", "exporter_address": "SITE Area, Karachi, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Yusuf Al-Mansoori", "buyer_company": "LuLu Hypermarket", "buyer_address": "Mussafah, Abu Dhabi, UAE", "buyer_country": "UAE", "buyer_city": "Abu Dhabi", "buyer_email": "yusuf.m@lulugroup.ae", "product_name": "Denim Jeans", "product_category": "Trousers", "unit_price": 8.30, "currency": "USD", "quantity": 6200, "unit": "pcs", "shipment_date": "2025-11-28", "gd_number": "KHIP-2025-3460", "invoice_number": "KGC-3460", "notes": "Stretch denim"},
    {"exporter_name": "Tariq Mehmood", "exporter_company": "Sialkot Sports Goods Co", "exporter_address": "Pasrur Rd, Sialkot, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Mark Wilson", "buyer_company": "Decathlon UK", "buyer_address": "Surrey Quays Rd, London, UK", "buyer_country": "UK", "buyer_city": "London", "buyer_email": "mark.wilson@decathlon.co.uk", "product_name": "Football (Size 5)", "product_category": "Sportswear", "unit_price": 9.50, "currency": "GBP", "quantity": 5000, "unit": "pcs", "shipment_date": "2025-12-05", "gd_number": "SKTP-2025-9912", "invoice_number": "SSG-9912", "notes": "Hand-stitched, FIFA approved"},
    {"exporter_name": "Tariq Mehmood", "exporter_company": "Sialkot Sports Goods Co", "exporter_address": "Pasrur Rd, Sialkot, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Robert Jones", "buyer_company": "Adidas Sourcing North America", "buyer_address": "5055 N Greeley Ave, Portland, OR, USA", "buyer_country": "USA", "buyer_city": "Portland", "buyer_email": "r.jones@adidas-source.com", "product_name": "Cricket Bat (English Willow)", "product_category": "Sportswear", "unit_price": 42.00, "currency": "USD", "quantity": 1200, "unit": "pcs", "shipment_date": "2025-11-12", "gd_number": "SKTP-2025-9888", "invoice_number": "SSG-9888", "notes": "Grade 1 willow"},
    {"exporter_name": "Faisal Aslam", "exporter_company": "Sialkot Athletics Ltd", "exporter_address": "Daska Rd, Sialkot, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Liam O'Connor", "buyer_company": "Rebel Sport Australia", "buyer_address": "Sydney NSW, Australia", "buyer_country": "Australia", "buyer_city": "Sydney", "buyer_email": "liam@rebelsport.com.au", "product_name": "Boxing Gloves", "product_category": "Sportswear", "unit_price": 18.40, "currency": "USD", "quantity": 2800, "unit": "pairs", "shipment_date": "2025-12-08", "gd_number": "SKTP-2025-2210", "invoice_number": "SAL-2210", "notes": "12oz, leather"},
    {"exporter_name": "Faisal Aslam", "exporter_company": "Sialkot Athletics Ltd", "exporter_address": "Daska Rd, Sialkot, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Mark Wilson", "buyer_company": "Decathlon UK", "buyer_address": "Surrey Quays Rd, London, UK", "buyer_country": "UK", "buyer_city": "London", "buyer_email": "mark.wilson@decathlon.co.uk", "product_name": "Sports Jerseys", "product_category": "Sportswear", "unit_price": 6.85, "currency": "GBP", "quantity": 8800, "unit": "pcs", "shipment_date": "2025-11-25", "gd_number": "SKTP-2025-2240", "invoice_number": "SAL-2240", "notes": "Sublimation print"},
    {"exporter_name": "Tariq Mehmood", "exporter_company": "Sialkot Sports Goods Co", "exporter_address": "Pasrur Rd, Sialkot, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Hiroshi Tanaka", "buyer_company": "Mizuno Corporation", "buyer_address": "1-23 Kitahama, Chuo-ku, Osaka, Japan", "buyer_country": "Japan", "buyer_city": "Osaka", "buyer_email": "h.tanaka@mizuno.co.jp", "product_name": "Football (Size 5)", "product_category": "Sportswear", "unit_price": 11.20, "currency": "USD", "quantity": 3500, "unit": "pcs", "shipment_date": "2025-12-12", "gd_number": "SKTP-2025-9950", "invoice_number": "SSG-9950", "notes": "Premium grade"},
    {"exporter_name": "Nadia Iqbal", "exporter_company": "Faisalabad Home Textiles", "exporter_address": "Sargodha Rd, Faisalabad, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Sophie Martin", "buyer_company": "IKEA Sweden AB", "buyer_address": "Tulpanvägen 8, Älmhult, Sweden", "buyer_country": "Sweden", "buyer_city": "Älmhult", "buyer_email": "sophie.m@ikea.com", "product_name": "Bedsheet Set (King)", "product_category": "Bedlinen", "unit_price": 14.50, "currency": "EUR", "quantity": 6500, "unit": "sets", "shipment_date": "2025-11-08", "gd_number": "LHRP-2025-1102", "invoice_number": "FHT-1102", "notes": "200 thread count, percale"},
    {"exporter_name": "Nadia Iqbal", "exporter_company": "Faisalabad Home Textiles", "exporter_address": "Sargodha Rd, Faisalabad, Pakistan", "exporter_country": "Pakistan", "buyer_name": "John Miller", "buyer_company": "Bed Bath & Beyond", "buyer_address": "650 Liberty Ave, Union, NJ, USA", "buyer_country": "USA", "buyer_city": "Union", "buyer_email": "j.miller@bbb-sourcing.com", "product_name": "Duvet Cover Set", "product_category": "Bedlinen", "unit_price": 19.80, "currency": "USD", "quantity": 4200, "unit": "sets", "shipment_date": "2025-12-01", "gd_number": "LHRP-2025-1130", "invoice_number": "FHT-1130", "notes": "Reversible, queen"},
    {"exporter_name": "Hassan Raza", "exporter_company": "Faisalabad Apparel House", "exporter_address": "Jhang Road, Faisalabad, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Klaus Becker", "buyer_company": "Otto Group", "buyer_address": "Werner-Otto-Str 1-7, Hamburg, Germany", "buyer_country": "Germany", "buyer_city": "Hamburg", "buyer_email": "becker@otto.de", "product_name": "Pillow Cases", "product_category": "Bedlinen", "unit_price": 2.10, "currency": "EUR", "quantity": 22000, "unit": "pcs", "shipment_date": "2025-11-15", "gd_number": "LHRP-2025-7850", "invoice_number": "FAH-7850", "notes": "Standard size, 12 colors"},
    {"exporter_name": "Imran Ali", "exporter_company": "Karachi Towel Mills", "exporter_address": "Korangi Industrial Area, Karachi, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Emma Clarke", "buyer_company": "John Lewis Partnership", "buyer_address": "171 Victoria St, London, UK", "buyer_country": "UK", "buyer_city": "London", "buyer_email": "emma.c@johnlewis.co.uk", "product_name": "Bath Towels", "product_category": "Towels", "unit_price": 4.30, "currency": "GBP", "quantity": 16000, "unit": "pcs", "shipment_date": "2025-12-04", "gd_number": "KHIP-2025-5520", "invoice_number": "KTM-5520", "notes": "500gsm cotton"},
    {"exporter_name": "Imran Ali", "exporter_company": "Karachi Towel Mills", "exporter_address": "Korangi Industrial Area, Karachi, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Yusuf Al-Mansoori", "buyer_company": "Carrefour UAE", "buyer_address": "Mall of the Emirates, Dubai, UAE", "buyer_country": "UAE", "buyer_city": "Dubai", "buyer_email": "yusuf@carrefour.ae", "product_name": "Hand Towels", "product_category": "Towels", "unit_price": 1.85, "currency": "USD", "quantity": 30000, "unit": "pcs", "shipment_date": "2025-11-20", "gd_number": "KHIP-2025-5545", "invoice_number": "KTM-5545", "notes": "Hotel grade"},
    {"exporter_name": "Saima Naseer", "exporter_company": "Sialkot Leather Crafts", "exporter_address": "Wazirabad Rd, Sialkot, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Robert Jones", "buyer_company": "Levi Strauss & Co", "buyer_address": "1155 Battery St, San Francisco, CA, USA", "buyer_country": "USA", "buyer_city": "San Francisco", "buyer_email": "robert.j@levi.com", "product_name": "Leather Biker Jackets", "product_category": "Leather", "unit_price": 68.50, "currency": "USD", "quantity": 1500, "unit": "pcs", "shipment_date": "2025-12-10", "gd_number": "SKTP-2025-3301", "invoice_number": "SLC-3301", "notes": "Black, full grain cowhide"},
    {"exporter_name": "Saima Naseer", "exporter_company": "Sialkot Leather Crafts", "exporter_address": "Wazirabad Rd, Sialkot, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Sophie Martin", "buyer_company": "Zara Spain SA", "buyer_address": "Avenida de la Diputacion, Arteixo, Spain", "buyer_country": "Spain", "buyer_city": "Arteixo", "buyer_email": "s.martin@zara.com", "product_name": "Leather Wallets", "product_category": "Leather", "unit_price": 7.20, "currency": "EUR", "quantity": 8000, "unit": "pcs", "shipment_date": "2025-11-30", "gd_number": "SKTP-2025-3320", "invoice_number": "SLC-3320", "notes": "Bi-fold, brown"},
    {"exporter_name": "Dr. Asif Mahmood", "exporter_company": "Sialkot Surgical Instruments Co", "exporter_address": "Sialkot Cantt, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Hiroshi Tanaka", "buyer_company": "Medline Industries Japan", "buyer_address": "Tokyo, Japan", "buyer_country": "Japan", "buyer_city": "Tokyo", "buyer_email": "tanaka@medline.jp", "product_name": "Surgical Scissors Set", "product_category": "Medical", "unit_price": 14.20, "currency": "USD", "quantity": 4500, "unit": "sets", "shipment_date": "2025-12-06", "gd_number": "SKTP-2025-7700", "invoice_number": "SSI-7700", "notes": "Stainless steel, ISO certified"},
    {"exporter_name": "Adeel Hussain", "exporter_company": "Punjab Rice Exporters", "exporter_address": "Gujranwala, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Yusuf Al-Mansoori", "buyer_company": "Al Maya Group", "buyer_address": "Sheikh Zayed Rd, Dubai, UAE", "buyer_country": "UAE", "buyer_city": "Dubai", "buyer_email": "y.almansoori@almaya.ae", "product_name": "Basmati Rice 1121", "product_category": "Food", "unit_price": 1250.00, "currency": "USD", "quantity": 50, "unit": "tons", "shipment_date": "2025-11-18", "gd_number": "LHRP-2025-8800", "invoice_number": "PRE-8800", "notes": "Premium long grain"},
    {"exporter_name": "Adeel Hussain", "exporter_company": "Punjab Rice Exporters", "exporter_address": "Gujranwala, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Mohammed Rahman", "buyer_company": "Bangladesh Trading Co", "buyer_address": "Chittagong, Bangladesh", "buyer_country": "Bangladesh", "buyer_city": "Chittagong", "buyer_email": "m.rahman@btc.bd", "product_name": "IRRI-6 Rice", "product_category": "Food", "unit_price": 480.00, "currency": "USD", "quantity": 200, "unit": "tons", "shipment_date": "2025-12-03", "gd_number": "LHRP-2025-8830", "invoice_number": "PRE-8830", "notes": "Bulk shipment"},
    {"exporter_name": "Adeel Hussain", "exporter_company": "Multan Fresh Fruits", "exporter_address": "Multan, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Emma Clarke", "buyer_company": "Tesco UK", "buyer_address": "Tesco House, Welwyn Garden City, UK", "buyer_country": "UK", "buyer_city": "Welwyn", "buyer_email": "emma.c@tesco.com", "product_name": "Sindhri Mangoes", "product_category": "Food", "unit_price": 2.20, "currency": "GBP", "quantity": 18000, "unit": "kg", "shipment_date": "2025-07-15", "gd_number": "LHRP-2025-441", "invoice_number": "MFF-441", "notes": "Air shipment, premium grade"},
    {"exporter_name": "Wasim Akram", "exporter_company": "Lahore Carpet House", "exporter_address": "Mall Rd, Lahore, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Klaus Becker", "buyer_company": "Tchibo GmbH", "buyer_address": "Überseering 18, Hamburg, Germany", "buyer_country": "Germany", "buyer_city": "Hamburg", "buyer_email": "becker@tchibo.de", "product_name": "Hand-Knotted Carpets", "product_category": "Home Decor", "unit_price": 285.00, "currency": "EUR", "quantity": 320, "unit": "pcs", "shipment_date": "2025-11-26", "gd_number": "LHRP-2025-2201", "invoice_number": "LCH-2201", "notes": "Persian design, wool"},
    {"exporter_name": "Ali Raza", "exporter_company": "Faisalabad Apparel House", "exporter_address": "Jhang Road, Faisalabad, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Mark Wilson", "buyer_company": "Marks & Spencer", "buyer_address": "Waterside House, 35 N Wharf Rd, London, UK", "buyer_country": "UK", "buyer_city": "London", "buyer_email": "mark.w@marksandspencer.com", "product_name": "Flannel Shirts", "product_category": "Shirts", "unit_price": 8.20, "currency": "GBP", "quantity": 7200, "unit": "pcs", "shipment_date": "2025-10-18", "gd_number": "LHRP-2025-7900", "invoice_number": "FAH-7900", "notes": "Plaid, brushed cotton"},
    {"exporter_name": "Sana Tariq", "exporter_company": "Karachi Garments Co", "exporter_address": "SITE Area, Karachi, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Maria Rodriguez", "buyer_company": "El Corte Inglés", "buyer_address": "Calle Hermosilla 112, Madrid, Spain", "buyer_country": "Spain", "buyer_city": "Madrid", "buyer_email": "maria.r@elcorteingles.es", "product_name": "Denim Shirts", "product_category": "Shirts", "unit_price": 7.10, "currency": "EUR", "quantity": 5400, "unit": "pcs", "shipment_date": "2025-11-05", "gd_number": "KHIP-2025-3500", "invoice_number": "KGC-3500", "notes": "Light wash"},
    {"exporter_name": "Ahmed Khan", "exporter_company": "Lahore Textiles Pvt Ltd", "exporter_address": "Plot 42, Sundar Industrial Estate, Lahore, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Hiroshi Tanaka", "buyer_company": "Uniqlo Japan", "buyer_address": "1-6-7 Ariake, Koto, Tokyo, Japan", "buyer_country": "Japan", "buyer_city": "Tokyo", "buyer_email": "h.tanaka@uniqlo.co.jp", "product_name": "T-Shirts (Round Neck)", "product_category": "Shirts", "unit_price": 3.20, "currency": "USD", "quantity": 25000, "unit": "pcs", "shipment_date": "2025-12-14", "gd_number": "KHIP-2025-600", "invoice_number": "LTX-2025-600", "notes": "Cotton/poly blend"},
    # Italy embroidery (matching user's screenshot)
    {"exporter_name": "Neka Pak Industries", "exporter_company": "Neka Pak Industries", "exporter_address": "Chounni Solehria Rd, Sialkot, Pakistan", "exporter_country": "Pakistan", "buyer_name": "Sergio Imperatrice", "buyer_company": "L. Imperatrice Di Sergio", "buyer_address": "Naples, Italy", "buyer_country": "Italy", "buyer_city": "Naples", "buyer_email": "", "product_name": "Hand Embroidery Goods", "product_category": "Embroidery", "unit_price": 82.0, "currency": "EUR", "quantity": 49, "unit": "kg", "total_value": 4031.0, "gross_weight_kg": 49, "cartons": 3, "shipment_date": "2026-03-25", "gd_number": "GD #2", "invoice_number": "GD-2", "notes": "Hand embroidery, 3 cartons"},
]


@api_router.post("/seed")
async def seed(_: dict = Depends(require_admin)):
    count = await db.records.count_documents({})
    if count > 0:
        return {"seeded": False, "existing": count}
    docs = []
    for r in SAMPLE_RECORDS:
        rec = TradeRecord(**r)
        if not rec.total_value and rec.unit_price and rec.quantity:
            rec.total_value = round(rec.unit_price * rec.quantity, 2)
        docs.append(rec.model_dump())
    if docs:
        await db.records.insert_many(docs)
    return {"seeded": True, "count": len(docs)}


@api_router.get("/")
async def root():
    return {"message": "Trade Intelligence API"}


# Mount
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
