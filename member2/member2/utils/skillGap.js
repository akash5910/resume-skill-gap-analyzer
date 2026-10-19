const WEIGHT = { High: 3, Medium: 2, Low: 1 };
const norm = (s) => String(s).trim().toLowerCase();

/**
 * Compare user skills against a job role.
 * @param {string[]} userSkills
 * @param {object} role  JobRole document / plain object
 */
function analyzeSkills(userSkills = [], role) {
  const have = new Set(userSkills.map(norm));
  const required = role.requiredSkills;

  const matched = required.filter((s) => have.has(norm(s.name)));
  const missing = required.filter((s) => !have.has(norm(s.name)));

  // Formula from the plan: matched / total * 100
  const matchPercentage = required.length
    ? Math.round((matched.length / required.length) * 100)
    : 0;

  // Bonus: importance-weighted score
  const totalW = required.reduce((a, s) => a + WEIGHT[s.importance], 0);
  const gotW = matched.reduce((a, s) => a + WEIGHT[s.importance], 0);
  const weightedMatchPercentage = totalW ? Math.round((gotW / totalW) * 100) : 0;

  // Keep prerequisites earlier in the learning order, then use importance.
  const prioritySort = (a, b) =>
    WEIGHT[b.importance] - WEIGHT[a.importance] ||
    a.learningTimeWeeks - b.learningTimeWeeks;
  const missingSorted = [];
  const remaining = [...missing];
  while (remaining.length) {
    const ready = remaining.filter((skill) =>
      !(skill.prerequisites || []).some((prerequisite) =>
        remaining.some((other) => norm(other.name) === norm(prerequisite))
      )
    ).sort(prioritySort);
    // If role data has a prerequisite loop, still return a usable roadmap.
    const next = (ready.length ? ready : [...remaining].sort(prioritySort))[0];
    missingSorted.push(next);
    remaining.splice(remaining.indexOf(next), 1);
  }

  // Basic learning roadmap
  let week = 0;
  const roadmap = missingSorted.map((s, i) => {
    const start = week + 1;
    week += s.learningTimeWeeks;
    return {
      step: i + 1,
      skill: s.name,
      importance: s.importance,
      prerequisites: s.prerequisites || [],
      weeks: s.learningTimeWeeks,
      weekRange: `Week ${start}${s.learningTimeWeeks > 1 ? "-" + week : ""}`,
    };
  });

  return {
    role: role.name,
    matchPercentage,
    weightedMatchPercentage,
    totalRequired: required.length,
    matchedSkills: matched.map((s) => s.name),
    missingSkills: missingSorted.map((s) => ({
      name: s.name,
      importance: s.importance,
      learningTimeWeeks: s.learningTimeWeeks,
    })),
    roadmap,
    estimatedTotalWeeks: week,
  };
}

module.exports = { analyzeSkills };
