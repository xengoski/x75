// Attendance calculation engine and threshold margin formulas

export const calculateDayAttendanceStats = (records = {}, minThreshold = 75) => {
  const target = Math.min(100, Math.max(1, parseFloat(minThreshold) || 75));

  let attendedDays = 0;
  let conductedDays = 0;
  let holidayDays = 0;

  Object.values(records).forEach(rec => {
    if (!rec || !rec.status) return;

    if (rec.status === 'HOLIDAY') {
      holidayDays++;
    } else if (rec.status === 'PRESENT') {
      attendedDays++;
      conductedDays++;
    } else if (rec.status === 'ABSENT') {
      conductedDays++;
    } else if (rec.status === 'DUTY_LEAVE') {
      // Verified On-Duty / Medical counts as attended
      attendedDays++;
      conductedDays++;
    }
  });

  if (conductedDays === 0) {
    return {
      percentage: 100,
      percentageFormatted: '100.0',
      isSafe: true,
      safeLeaves: 0,
      daysNeeded: 0,
      attendedDays: 0,
      conductedDays: 0,
      holidayDays,
      target
    };
  }

  const percent = (attendedDays / conductedDays) * 100;
  const roundedPercent = Math.round(percent * 10) / 10;
  const isSafe = percent >= target;

  let safeLeaves = 0;
  let daysNeeded = 0;

  if (isSafe) {
    // floor((attended * 100 - target * conducted) / target)
    safeLeaves = Math.floor((attendedDays * 100 - target * conductedDays) / target);
    if (safeLeaves < 0) safeLeaves = 0;
  } else {
    // ceil((target * conducted - attended * 100) / (100 - target))
    if (target === 100) {
      daysNeeded = 999;
    } else {
      daysNeeded = Math.ceil((target * conductedDays - attendedDays * 100) / (100 - target));
      if (daysNeeded < 0) daysNeeded = 0;
    }
  }

  return {
    percentage: roundedPercent,
    percentageFormatted: roundedPercent.toFixed(1),
    isSafe,
    safeLeaves,
    daysNeeded,
    attendedDays,
    conductedDays,
    holidayDays,
    target
  };
};
