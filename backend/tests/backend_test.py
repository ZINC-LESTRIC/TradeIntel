import os
import io
import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://buyer-seller-db.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
PASSWORD = "trade2026"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"password": PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    t = r.json().get("token")
    assert t
    return t


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# ===== Auth =====
def test_login_wrong_password():
    r = requests.post(f"{API}/auth/login", json={"password": "wrong"}, timeout=30)
    assert r.status_code == 401


def test_protected_no_token():
    for path in ["/stats", "/records", "/filters", "/search?q=shirts", "/seed"]:
        method = requests.post if path == "/seed" else requests.get
        r = method(f"{API}{path}", timeout=30)
        assert r.status_code == 401, f"{path} expected 401 got {r.status_code}"


# ===== Seed =====
def test_seed(auth):
    r = requests.post(f"{API}/seed", headers=auth, timeout=60)
    assert r.status_code == 200, r.text
    data = r.json()
    # Either seeded first time or already seeded
    if data.get("seeded") is True:
        assert data["count"] >= 25
    else:
        assert data["existing"] >= 25


def test_seed_idempotent(auth):
    r = requests.post(f"{API}/seed", headers=auth, timeout=60)
    assert r.status_code == 200
    data = r.json()
    assert data.get("seeded") is False
    assert data.get("existing", 0) >= 25


# ===== Stats =====
def test_stats(auth):
    r = requests.get(f"{API}/stats", headers=auth, timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["total_records", "unique_products", "unique_buyers",
              "unique_countries", "total_value", "top_countries",
              "top_products", "recent"]:
        assert k in d, f"Missing key {k}"
    assert d["total_records"] >= 25
    assert d["total_value"] > 0
    assert isinstance(d["top_countries"], list) and len(d["top_countries"]) > 0
    assert isinstance(d["top_products"], list) and len(d["top_products"]) > 0


# ===== Search =====
def test_search_shirts(auth):
    r = requests.get(f"{API}/search", params={"q": "shirts"}, headers=auth, timeout=30)
    assert r.status_code == 200
    d = r.json()
    assert d["total"] > 0
    for group_key in ["by_country", "by_buyer", "by_exporter"]:
        assert group_key in d
        assert isinstance(d[group_key], list)
        assert len(d[group_key]) > 0
        g0 = d[group_key][0]
        assert "records" in g0 and isinstance(g0["records"], list)
        assert "count" in g0 and g0["count"] >= 1
        assert "total_value" in g0
        assert "min_price" in g0 and "max_price" in g0


# ===== Records list with filters =====
def test_list_records(auth):
    r = requests.get(f"{API}/records", headers=auth, timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 25


def test_list_records_filters(auth):
    r = requests.get(f"{API}/records", params={"q": "shirts"}, headers=auth, timeout=30)
    assert r.status_code == 200 and len(r.json()) > 0
    r = requests.get(f"{API}/records", params={"country": "USA"}, headers=auth, timeout=30)
    assert r.status_code == 200
    for rec in r.json():
        assert rec["buyer_country"].lower() == "usa"
    r = requests.get(f"{API}/records", params={"product": "Shirts"}, headers=auth, timeout=30)
    assert r.status_code == 200 and len(r.json()) > 0


# ===== CRUD =====
def test_records_crud(auth):
    payload = {
        "exporter_company": "TEST_Exporter Co",
        "buyer_company": "TEST_Buyer Ltd",
        "buyer_country": "TestLand",
        "product_name": "TEST_Widget",
        "unit_price": 2.5,
        "quantity": 10,
    }
    r = requests.post(f"{API}/records", headers=auth, json=payload, timeout=30)
    assert r.status_code == 200, r.text
    rec = r.json()
    assert rec["total_value"] == 25.0
    rid = rec["id"]

    r = requests.get(f"{API}/records/{rid}", headers=auth, timeout=30)
    assert r.status_code == 200 and r.json()["product_name"] == "TEST_Widget"

    r = requests.put(f"{API}/records/{rid}", headers=auth,
                     json={**payload, "unit_price": 5.0, "quantity": 10, "total_value": 0},
                     timeout=30)
    assert r.status_code == 200
    assert r.json()["total_value"] == 50.0

    r = requests.get(f"{API}/records/{rid}", headers=auth, timeout=30)
    assert r.json()["unit_price"] == 5.0

    r = requests.delete(f"{API}/records/{rid}", headers=auth, timeout=30)
    assert r.status_code == 200
    r = requests.get(f"{API}/records/{rid}", headers=auth, timeout=30)
    assert r.status_code == 404


# ===== Filters =====
def test_filters(auth):
    r = requests.get(f"{API}/filters", headers=auth, timeout=30)
    assert r.status_code == 200
    d = r.json()
    for k in ["countries", "buyers", "exporters", "products", "categories"]:
        assert k in d and isinstance(d[k], list) and len(d[k]) > 0


# ===== Extract (Gemini) =====
def _make_invoice_png():
    img = Image.new("RGB", (900, 700), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
        font_s = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    except Exception:
        font = ImageFont.load_default()
        font_s = ImageFont.load_default()
    lines = [
        ("COMMERCIAL INVOICE", font),
        ("Invoice No: INV-2025-9911   Date: 2025-12-20", font_s),
        ("", font_s),
        ("EXPORTER: Lahore Textiles Pvt Ltd", font_s),
        ("Address: Plot 42, Sundar Industrial Estate, Lahore, Pakistan", font_s),
        ("Contact: Ahmed Khan", font_s),
        ("", font_s),
        ("BUYER: H&M North America", font_s),
        ("Address: 110 Fifth Ave, New York, NY 10011, USA", font_s),
        ("Email: j.miller@hm-buying.com", font_s),
        ("", font_s),
        ("Product: Cotton Casual Shirts", font_s),
        ("Category: Shirts", font_s),
        ("Quantity: 12000 pcs", font_s),
        ("Unit Price: USD 4.85", font_s),
        ("Total Value: USD 58,200.00", font_s),
        ("Shipment Date: 2025-12-28", font_s),
    ]
    y = 20
    for text, f in lines:
        d.text((30, y), text, fill="black", font=f)
        y += 32
    # Add a border box to introduce edges/features
    d.rectangle([(10, 10), (890, 690)], outline="black", width=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def test_extract_image(auth):
    img = _make_invoice_png()
    files = {"file": ("invoice.png", img, "image/png")}
    r = requests.post(f"{API}/extract", headers=auth, files=files, timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "extracted" in d and "raw" in d
    ex = d["extracted"]
    # Expect at least some fields populated
    populated = [v for v in ex.values() if v not in ("", 0, 0.0, None)]
    assert len(populated) >= 3, f"Too few fields extracted: {ex}"
