const request = require("supertest");
const {
  app,
  applySeason,
  applyWeekend,
  applyLongStay,
  applySeaView,
  applyBreakfast,
  calculateTotal,
} = require("../index");

// ─────────────────────────────────────────────
// Unit tests — fonctions helpers (couverture branches)
// ─────────────────────────────────────────────

describe("applySeason", () => {
  test("Haute saison → ×1.5", () => {
    expect(applySeason(100, "Haute")).toBe(150);
  });
  test("Basse saison → inchangé", () => {
    expect(applySeason(100, "Basse")).toBe(100);
  });
});

describe("applyWeekend", () => {
  test("weekend actif → ×1.2", () => {
    expect(applyWeekend(100, true)).toBe(120);
  });
  test("pas de weekend → inchangé", () => {
    expect(applyWeekend(100, false)).toBe(100);
  });
});

describe("applyLongStay", () => {
  test("plus de 7 nuits → ×0.85", () => {
    expect(applyLongStay(1000, 10)).toBe(850);
  });
  test("7 nuits ou moins → inchangé", () => {
    expect(applyLongStay(1000, 7)).toBe(1000);
  });
});

describe("applySeaView", () => {
  test("vue mer → +30 par nuit", () => {
    expect(applySeaView(200, true, 3)).toBe(290);
  });
  test("pas de vue mer → inchangé", () => {
    expect(applySeaView(200, false, 3)).toBe(200);
  });
});

describe("applyBreakfast", () => {
  test("client Normal → +15 par personne par nuit", () => {
    expect(applyBreakfast(200, "Normal", 2, 2)).toBe(260);
  });
  test("client VIP → pas de petit-déjeuner", () => {
    expect(applyBreakfast(200, "VIP", 2, 2)).toBe(200);
  });
});

describe("calculateTotal", () => {
  test("calcul complet avec tous les modificateurs", () => {
    // 100*2=200 → *1.5=300 → *1.2=360 → +30*2=420 → +15*2*2=480
    expect(calculateTotal({
      pricePerNight: 100,
      nights: 2,
      season: "Haute",
      hasWeekend: true,
      seaView: true,
      clientType: "Normal",
      persons: 2,
    })).toBe(480);
  });

  test("calcul minimal sans aucun modificateur", () => {
    // 100*1 = 100
    expect(calculateTotal({
      pricePerNight: 100,
      nights: 1,
      season: "Basse",
      hasWeekend: false,
      seaView: false,
      clientType: "VIP",
      persons: 0,
    })).toBe(100);
  });
});

// ─────────────────────────────────────────────
// Integration tests — route POST /api/book-room
// ─────────────────────────────────────────────

describe("POST /api/book-room", () => {

  test("cas complet (haute + weekend + seaView + normal)", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
      nights: 2,
      season: "Haute",
      hasWeekend: true,
      seaView: true,
      clientType: "Normal",
      persons: 2,
    });
    expect(res.statusCode).toBe(200);
    // 100*2=200 → *1.5=300 → *1.2=360 → +30*2=420 → +15*2*2=480
    expect(res.body.total).toBe(480);
  });

  test("basse saison — aucune option", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
      nights: 1,
      season: "Basse",
      hasWeekend: false,
      seaView: false,
      clientType: "VIP",
      persons: 1,
    });
    expect(res.statusCode).toBe(200);
    // 100*1 = 100
    expect(res.body.total).toBe(100);
  });

  test("haute saison — multiplicateur ×1.5", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
      nights: 1,
      season: "Haute",
      hasWeekend: false,
      seaView: false,
      clientType: "VIP",
      persons: 1,
    });
    expect(res.statusCode).toBe(200);
    // 100 → *1.5 = 150
    expect(res.body.total).toBe(150);
  });

  test("weekend — multiplicateur ×1.2", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
      nights: 1,
      season: "Basse",
      hasWeekend: true,
      seaView: false,
      clientType: "VIP",
      persons: 1,
    });
    expect(res.statusCode).toBe(200);
    // 100 → *1.2 = 120
    expect(res.body.total).toBe(120);
  });

  test("long séjour (>7 nuits) — réduction 15%", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
      nights: 10,
      season: "Basse",
      hasWeekend: false,
      seaView: false,
      clientType: "VIP",
      persons: 1,
    });
    expect(res.statusCode).toBe(200);
    // 100*10=1000 → *0.85 = 850
    expect(res.body.total).toBe(850);
  });

  test("séjour ≤7 nuits — pas de réduction", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
      nights: 7,
      season: "Basse",
      hasWeekend: false,
      seaView: false,
      clientType: "VIP",
      persons: 1,
    });
    expect(res.statusCode).toBe(200);
    // 100*7 = 700
    expect(res.body.total).toBe(700);
  });

  test("vue mer — +30€ par nuit", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
      nights: 2,
      season: "Basse",
      hasWeekend: false,
      seaView: true,
      clientType: "VIP",
      persons: 1,
    });
    expect(res.statusCode).toBe(200);
    // 100*2=200 → +30*2 = 260
    expect(res.body.total).toBe(260);
  });

  test("petit-déjeuner — +15€/personne/nuit pour non-VIP", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
      nights: 2,
      season: "Basse",
      hasWeekend: false,
      seaView: false,
      clientType: "Normal",
      persons: 2,
    });
    expect(res.statusCode).toBe(200);
    // 100*2=200 → +15*2*2 = 260
    expect(res.body.total).toBe(260);
  });

  test("VIP — pas de petit-déjeuner facturé", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
      nights: 2,
      season: "Basse",
      hasWeekend: false,
      seaView: false,
      clientType: "VIP",
      persons: 2,
    });
    expect(res.statusCode).toBe(200);
    // 100*2 = 200
    expect(res.body.total).toBe(200);
  });

  test("combinaison multiple — résultat correct", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
      nights: 5,
      season: "Haute",
      hasWeekend: true,
      seaView: true,
      clientType: "Normal",
      persons: 2,
    });
    expect(res.statusCode).toBe(200);
    // 100*5=500 → *1.5=750 → *1.2=900 → +30*5=1050 → +15*2*5=1200
    expect(res.body.total).toBe(1200);
  });

  test("input invalide (body vide) — 400", async () => {
    const res = await request(app).post("/api/book-room").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  test("input invalide (nights manquant) — 400", async () => {
    const res = await request(app).post("/api/book-room").send({
      pricePerNight: 100,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  test("input invalide (pricePerNight manquant) — 400", async () => {
    const res = await request(app).post("/api/book-room").send({
      nights: 3,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

});
