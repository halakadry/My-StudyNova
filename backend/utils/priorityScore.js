function calculatePriorityScore(task, availableHoursPerDay) {
  const now = new Date();
  const deadline = new Date(task.deadline);
  const daysUntilDeadline = Math.max(
    1,
    Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))
  );

  const difficultyWeights = { easy: 1, medium: 1.5, hard: 2 };
  const difficultyWeight = difficultyWeights[task.difficulty?.toLowerCase()] || 1.5;

  const durationWeight = task.durationHours / availableHoursPerDay;

  const priorityScore = (1 / daysUntilDeadline) * difficultyWeight * durationWeight;

  return Math.round(priorityScore * 10000) / 10000;
}

module.exports = calculatePriorityScore;