const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function calculateWeeklyAvailability(user) {
  const sleepTime = user.sleepTime ?? 23;
  const wakeTime = user.wakeTime ?? 8;

  const sleepHours = sleepTime > wakeTime ? (24 - sleepTime) + wakeTime : wakeTime - sleepTime;
  const awakeHours = 24 - sleepHours;

  const commutingHours = user.constraints?.commutingHours || 0;

  const availability = {};

  DAYS.forEach(day => {
    const commitmentsToday = (user.recurringCommitments || []).filter(c => c.day === day);
    const committedHours = commitmentsToday.reduce((sum, c) => sum + (c.endHour - c.startHour), 0);

    const baselineDowntime = 2;

    const freeHours = Math.max(0, awakeHours - commutingHours - committedHours - baselineDowntime);
    availability[day] = Math.round(freeHours * 10) / 10;
  });

  return availability;
}

module.exports = calculateWeeklyAvailability;