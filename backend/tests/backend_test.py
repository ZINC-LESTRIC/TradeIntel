"""
Trade Intelligence Dashboard - Backend tests (iteration 2)
Tests JWT auth (admin + viewer), RBAC (write endpoints admin-only),
records CRUD, search, stats, filters, admin user management (ban/unban/delete),
seed idempotency, and Gemini extract (admin only).
"""
import os
import io
import uuid
import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "azulmax990@gmail.com"
ADMIN_PASSWORD = "Admin@2026"

# unique viewer per run
_RUN = uuid.uuid4().hex[:8]
VIEWER_EMAIL = f"TEST_viewer_{_RUN}@test.com"
VIEWER_PASSWORD = "viewer123"


# ===================== Fixtures =====================
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "admin"
    assert body["user"]["email"] == ADMIN_EMAIL.lower()
    return body["token"]


@pytest.fixture(scope="session")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def viewer_creds(admin_h):
    # register a brand-new viewer for this test run
    r = requests.post(f"{API}/auth/register",
                      json={"email": VIEWER_EMAIL, "password": VIEWER_PASSWORD,
                            "name": "Test Viewer"}, timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["role"] == "viewer"
    assert body["user"]["banned"] is False
    yield {"token": body["token"], "user": body["user"]}
    # cleanup
    uid = body["user"]["id"]
    requests.delete(f"{API}/admin/users/{uid}", headers=admin_h, timeout=30)


@pytest.fixture(scope="session")
def viewer_h(viewer_creds):
    return {"Authorization": f"Bearer {viewer_creds['token']}"}


# ===================== AUTH =====================
class TestAuth:
    def test_admin_login_success(self, admin_token):
        assert admin_token and isinstance(admin_token, str)

    def test_admin_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "WrongPass!"}, timeout=30)
        assert r.status_code == 401

    def test_register_viewer(self, viewer_creds):
        assert viewer_creds["user"]["role"] == "viewer"
        assert viewer_creds["token"]

    def test_register_duplicate_email(self, viewer_creds):
        r = requests.post(f"{API}/auth/register",
                          json={"email": VIEWER_EMAIL, "password": "another1"}, timeout=30)
        assert r.status_code == 400

    def test_register_short_password(self):
        r = requests.post(f"{API}/auth/register",
                          json={"email": f"TEST_short_{_RUN}@test.com", "password": "abc"},
                          timeout=30)
        assert r.status_code == 400

    def test_me_admin(self, admin_h):
        r = requests.get(f"{API}/auth/me", headers=admin_h, timeout=30)
        assert r.status_code == 200
        u = r.json()
        assert u["role"] == "admin" and u["email"] == ADMIN_EMAIL.lower()

    def test_me_viewer(self, viewer_h):
        r = requests.get(f"{API}/auth/me", headers=viewer_h, timeout=30)
        assert r.status_code == 200
        assert r.json()["role"] == "viewer"

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401


# ===================== READS (both roles) =====================
class TestReadsBothRoles:
    @pytest.mark.parametrize("role", ["admin", "viewer"])
    def test_read_endpoints(self, role, admin_h, viewer_h):
        h = admin_h if role == "admin" else viewer_h
        for path in ["/records", "/stats", "/filters", "/search?q=shirts"]:
            r = requests.get(f"{API}{path}", headers=h, timeout=30)
            assert r.status_code == 200, f"{role} {path}: {r.status_code} {r.text[:200]}"


# ===================== WRITE RBAC =====================
class TestWriteRBAC:
    def test_viewer_cannot_post_record(self, viewer_h):
        r = requests.post(f"{API}/records", headers=viewer_h,
                          json={"product_name": "TEST_x"}, timeout=30)
        assert r.status_code == 403

    def test_viewer_cannot_seed(self, viewer_h):
        r = requests.post(f"{API}/seed", headers=viewer_h, timeout=30)
        assert r.status_code == 403

    def test_viewer_cannot_extract(self, viewer_h):
        files = {"file": ("x.png", b"\x89PNG\r\n\x1a\n", "image/png")}
        r = requests.post(f"{API}/extract", headers=viewer_h, files=files, timeout=30)
        assert r.status_code == 403

    def test_viewer_cannot_list_users(self, viewer_h):
        r = requests.get(f"{API}/admin/users", headers=viewer_h, timeout=30)
        assert r.status_code == 403


# ===================== SEED =====================
class TestSeed:
    def test_seed_idempotent(self, admin_h):
        r = requests.post(f"{API}/seed", headers=admin_h, timeout=60)
        assert r.status_code == 200
        d = r.json()
        # DB is already seeded per task context (30 records)
        if d.get("seeded") is True:
            assert d["count"] >= 25
        else:
            assert d.get("existing", 0) >= 25

    def test_seed_second_call(self, admin_h):
        r = requests.post(f"{API}/seed", headers=admin_h, timeout=60)
        assert r.status_code == 200
        assert r.json().get("seeded") is False


# ===================== RECORDS CRUD (admin) =====================
class TestRecordsCRUD:
    def test_admin_crud_flow(self, admin_h):
        payload = {
            "exporter_company": "TEST_Exporter Co",
            "buyer_company": "TEST_Buyer Ltd",
            "buyer_country": "TestLand",
            "buyer_city": "TestCity",
            "product_name": "TEST_Widget",
            "unit_price": 2.5, "quantity": 10, "currency": "USD",
            "gd_number": "TEST-GD-1", "gross_weight_kg": 100, "cartons": 5,
        }
        r = requests.post(f"{API}/records", headers=admin_h, json=payload, timeout=30)
        assert r.status_code == 200, r.text
        rec = r.json()
        assert rec["total_value"] == 25.0
        assert rec["gd_number"] == "TEST-GD-1"
        assert rec["cartons"] == 5
        rid = rec["id"]

        # GET verify persistence
        r = requests.get(f"{API}/records/{rid}", headers=admin_h, timeout=30)
        assert r.status_code == 200
        assert r.json()["product_name"] == "TEST_Widget"
        assert r.json()["buyer_city"] == "TestCity"

        # UPDATE
        r = requests.put(f"{API}/records/{rid}", headers=admin_h,
                         json={**payload, "unit_price": 5.0, "total_value": 0}, timeout=30)
        assert r.status_code == 200
        r = requests.get(f"{API}/records/{rid}", headers=admin_h, timeout=30)
        assert r.json()["unit_price"] == 5.0
        assert r.json()["total_value"] == 50.0

        # DELETE
        r = requests.delete(f"{API}/records/{rid}", headers=admin_h, timeout=30)
        assert r.status_code == 200
        r = requests.get(f"{API}/records/{rid}", headers=admin_h, timeout=30)
        assert r.status_code == 404


# ===================== STATS / FILTERS =====================
class TestStatsFilters:
    def test_stats(self, admin_h):
        r = requests.get(f"{API}/stats", headers=admin_h, timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_records", "unique_products", "unique_buyers", "unique_countries",
                  "total_value", "top_countries", "top_products", "recent"]:
            assert k in d
        assert d["total_records"] >= 25
        assert d["total_value"] > 0

    def test_filters(self, admin_h):
        r = requests.get(f"{API}/filters", headers=admin_h, timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["countries", "buyers", "exporters", "products", "categories"]:
            assert isinstance(d[k], list) and len(d[k]) > 0


# ===================== SEARCH (Italy embroidery) =====================
class TestSearchEmbroidery:
    def test_embroidery_record(self, admin_h):
        r = requests.get(f"{API}/search", params={"q": "embroidery"},
                         headers=admin_h, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] >= 1
        rec = next((x for x in d["records"]
                    if "Neka Pak" in (x.get("exporter_company") or "")), None)
        assert rec, f"Neka Pak Industries record not found in: {[r.get('exporter_company') for r in d['records']]}"
        assert rec["buyer_country"] == "Italy"
        assert rec["buyer_city"] == "Naples"
        assert rec["currency"] == "EUR"
        assert rec["gd_number"] == "GD #2"
        assert rec["gross_weight_kg"] == 49
        assert rec["cartons"] == 3
        assert rec["unit_price"] == 82.0


# ===================== ADMIN USER MGMT =====================
class TestAdminUserMgmt:
    def test_list_users_returns_required_fields(self, admin_h):
        r = requests.get(f"{API}/admin/users", headers=admin_h, timeout=30)
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list) and len(users) >= 1
        u0 = users[0]
        for k in ["email", "name", "role", "banned", "last_login", "created_at"]:
            assert k in u0, f"Missing field {k} in admin user list"

    def test_admin_cannot_ban_another_admin(self, admin_h):
        r = requests.get(f"{API}/admin/users", headers=admin_h, timeout=30)
        admin_user = next(u for u in r.json() if u["role"] == "admin")
        r = requests.post(f"{API}/admin/users/{admin_user['id']}/ban",
                          headers=admin_h, timeout=30)
        assert r.status_code == 400

    def test_admin_cannot_delete_admin(self, admin_h):
        r = requests.get(f"{API}/admin/users", headers=admin_h, timeout=30)
        admin_user = next(u for u in r.json() if u["role"] == "admin")
        r = requests.delete(f"{API}/admin/users/{admin_user['id']}",
                            headers=admin_h, timeout=30)
        assert r.status_code == 400

    def test_ban_unban_flow(self, admin_h):
        # create a fresh viewer to ban
        email = f"TEST_banme_{uuid.uuid4().hex[:8]}@test.com"
        pw = "banme123"
        reg = requests.post(f"{API}/auth/register",
                            json={"email": email, "password": pw}, timeout=30)
        assert reg.status_code == 200
        uid = reg.json()["user"]["id"]
        tok = reg.json()["token"]
        vh = {"Authorization": f"Bearer {tok}"}

        # Ban
        r = requests.post(f"{API}/admin/users/{uid}/ban", headers=admin_h, timeout=30)
        assert r.status_code == 200

        # Banned user with existing token -> 403
        r = requests.get(f"{API}/auth/me", headers=vh, timeout=30)
        assert r.status_code == 403
        assert "suspen" in r.text.lower() or "ban" in r.text.lower()

        # Banned user cannot login -> 403
        r = requests.post(f"{API}/auth/login",
                          json={"email": email, "password": pw}, timeout=30)
        assert r.status_code == 403

        # Unban
        r = requests.post(f"{API}/admin/users/{uid}/unban", headers=admin_h, timeout=30)
        assert r.status_code == 200

        # Re-login works
        r = requests.post(f"{API}/auth/login",
                          json={"email": email, "password": pw}, timeout=30)
        assert r.status_code == 200
        new_tok = r.json()["token"]
        nh = {"Authorization": f"Bearer {new_tok}"}
        r = requests.get(f"{API}/records", headers=nh, timeout=30)
        assert r.status_code == 200

        # cleanup
        requests.delete(f"{API}/admin/users/{uid}", headers=admin_h, timeout=30)


# ===================== EXTRACT (Gemini) =====================
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
        ("Invoice No: INV-2026-9911   Date: 2026-01-20", font_s),
        ("GD Number: KHIP-2026-001", font_s),
        ("EXPORTER: Lahore Textiles Pvt Ltd", font_s),
        ("BUYER: H&M North America (New York, USA)", font_s),
        ("Product: Cotton Casual Shirts (Shirts)", font_s),
        ("Quantity: 12000 pcs   Unit Price: USD 4.85", font_s),
        ("Gross Weight: 1200 kg   Cartons: 60", font_s),
        ("Total Value: USD 58,200.00", font_s),
    ]
    y = 20
    for text, f in lines:
        d.text((30, y), text, fill="black", font=f)
        y += 40
    d.rectangle([(10, 10), (890, 690)], outline="black", width=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


class TestExtract:
    def test_admin_extract(self, admin_h):
        img = _make_invoice_png()
        files = {"file": ("invoice.png", img, "image/png")}
        r = requests.post(f"{API}/extract", headers=admin_h, files=files, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "extracted" in d and "raw" in d
        ex = d["extracted"]
        populated = [v for v in ex.values() if v not in ("", 0, 0.0, None)]
        assert len(populated) >= 3
