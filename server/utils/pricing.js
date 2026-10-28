const SeasonalPrice = require('../models/SeasonalPrice');
const { DAY } = require('./dates');

// Price for a stay. Every night costs the room's base price adjusted by the strongest
// seasonal rule that covers that night (e.g. festival season +25%).
const quote = async (room, checkIn, checkOut) => {
  const rules = await SeasonalPrice.find({ active: true, startDate: { $lt: checkOut }, endDate: { $gte: checkIn } });
  const nightly = [];
  let total = 0;
  for (let t = checkIn.getTime(); t < checkOut.getTime(); t += DAY) {
    const night = new Date(t);
    const matching = rules
      .filter((r) => night >= r.startDate && night <= r.endDate && (r.roomType === 'all' || r.roomType === room.type))
      .sort((a, b) => b.percent - a.percent);
    const rule = matching[0];
    const price = Math.round(room.pricePerNight * (1 + (rule ? rule.percent : 0) / 100));
    nightly.push({ date: night.toISOString().slice(0, 10), price, rule: rule ? rule.name : null });
    total += price;
  }
  return { nights: nightly.length, total, basePrice: room.pricePerNight, nightly };
};

module.exports = { quote };
