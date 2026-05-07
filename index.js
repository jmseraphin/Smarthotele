const express = require("express");
const app = express();

app.use(express.json());

// --- Pricing rules (pure functions, easy to unit-test individually) ---

function applySeason(total, season) {
  return season === "Haute" ? total * 1.5 : total;
}

function applyWeekend(total, hasWeekend) {
  return hasWeekend ? total * 1.2 : total;
}

function applyLongStay(total, nights) {
  return nights > 7 ? total * 0.85 : total;
}

function applySeaView(total, seaView, nights) {
  return seaView ? total + 30 * nights : total;
}

function applyBreakfast(total, clientType, persons, nights) {
  return clientType !== "VIP" ? total + 15 * persons * nights : total;
}

// --- Core calculation (single responsibility, no side effects) ---

function calculateTotal(data) {
  let total = data.pricePerNight * data.nights;

  total = applySeason(total, data.season);
  total = applyWeekend(total, data.hasWeekend);
  total = applyLongStay(total, data.nights);
  total = applySeaView(total, data.seaView, data.nights);
  total = applyBreakfast(total, data.clientType, data.persons, data.nights);

  return total;
}

// --- Route ---

app.post("/api/book-room", (req, res) => {
  const data = req.body;

  if (!data.pricePerNight || !data.nights) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const total = calculateTotal(data);
  return res.json({ total });
});

// --- Server bootstrap ---

/* istanbul ignore next */
if (require.main === module) {
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
}

module.exports = {
  app,
  applySeason,
  applyWeekend,
  applyLongStay,
  applySeaView,
  applyBreakfast,
  calculateTotal,
};
