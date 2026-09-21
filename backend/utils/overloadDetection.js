function detectOverload(schedule, availableHoursPerDay) {
  const dailyTotals = {};

  // Sum hours per day
  schedule.forEach(entry => {
    dailyTotals[entry.date] = (dailyTotals[entry.date] || 0) + entry.hours;
  });

  const overloadedDays = [];
  Object.entries(dailyTotals).forEach(([date, totalHours]) => {
    if (totalHours > availableHoursPerDay) {
      overloadedDays.push({
        date,
        totalHours,
        excessHours: Math.round((totalHours - availableHoursPerDay) * 100) / 100
      });
    }
  });

  const totalDays = Object.keys(dailyTotals).length;
  const overloadPercentage = totalDays > 0 ? overloadedDays.length / totalDays : 0;

  return {
    overloadedDays,
    isOverloaded: overloadedDays.length > 0,
    needsRegeneration: overloadPercentage > 0.3
  };
}

module.exports = detectOverload;