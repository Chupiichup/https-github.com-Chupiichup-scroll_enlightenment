import { addMonths, addWeeks, endOfMonth, endOfQuarter, endOfYear, format, isAfter, isBefore, startOfMonth, startOfQuarter, startOfWeek, startOfYear, differenceInWeeks, getQuarter, getMonth, getYear, eachWeekOfInterval, eachMonthOfInterval, eachQuarterOfInterval, startOfToday } from 'date-fns';

export interface DecompositionResult {
  level: "year" | "quarter" | "month" | "week";
  timeValue: string; // e.g., "2026", "Q2-2026", "M4-2026", "W15-2026"
  targetValue: number;
  startDate: string;
  endDate: string;
  children?: DecompositionResult[];
}

export function decomposeGoal(
  title: string,
  totalTarget: number,
  durationType: "year" | "quarter" | "month",
  selectedTime: string, // e.g., "2026", "Q2-2026", "M4-2026"
  unit: string
): DecompositionResult[] {
  const now = startOfToday();
  let startDate: Date;
  let endDate: Date;

  if (durationType === "year") {
    const year = parseInt(selectedTime);
    startDate = startOfYear(new Date(year, 0, 1));
    endDate = endOfYear(startDate);
  } else if (durationType === "quarter") {
    const [q, y] = selectedTime.split("-");
    const quarter = parseInt(q.substring(1));
    const year = parseInt(y);
    startDate = startOfQuarter(new Date(year, (quarter - 1) * 3, 1));
    endDate = endOfQuarter(startDate);
  } else {
    const [m, y] = selectedTime.split("-");
    const month = parseInt(m.substring(1));
    const year = parseInt(y);
    startDate = startOfMonth(new Date(year, month - 1, 1));
    endDate = endOfMonth(startDate);
  }

  // If start date is in the past, adjust to now
  const actualStart = isBefore(startDate, now) ? now : startDate;
  if (isAfter(actualStart, endDate)) return [];

  const results: DecompositionResult[] = [];

  if (durationType === "year") {
    // Year -> Quarters
    const quarters = eachQuarterOfInterval({ start: actualStart, end: endDate });
    const perQuarter = Math.floor(totalTarget / quarters.length);
    let remainder = totalTarget % quarters.length;

    quarters.forEach((qDate, index) => {
      const qVal = perQuarter + (index < remainder ? 1 : 0);
      if (qVal <= 0) return;

      const qStart = isBefore(startOfQuarter(qDate), actualStart) ? actualStart : startOfQuarter(qDate);
      const qEnd = endOfQuarter(qDate);
      const qLabel = `Q${getQuarter(qDate)}-${getYear(qDate)}`;

      const months = eachMonthOfInterval({ start: qStart, end: qEnd });
      const perMonth = Math.floor(qVal / months.length);
      let mRemainder = qVal % months.length;

      const monthResults: DecompositionResult[] = [];
      months.forEach((mDate, mIndex) => {
        const mVal = perMonth + (mIndex < mRemainder ? 1 : 0);
        if (mVal <= 0) return;

        const mStart = isBefore(startOfMonth(mDate), qStart) ? qStart : startOfMonth(mDate);
        const mEnd = endOfMonth(mDate);
        const mLabel = `M${getMonth(mDate) + 1}-${getYear(mDate)}`;

        const weeks = eachWeekOfInterval({ start: mStart, end: mEnd }, { weekStartsOn: 1 });
        const perWeek = Math.floor(mVal / weeks.length);
        let wRemainder = mVal % weeks.length;

        const weekResults: DecompositionResult[] = [];
        weeks.forEach((wDate, wIndex) => {
          const wVal = perWeek + (wIndex < wRemainder ? 1 : 0);
          if (wVal <= 0) return;
          weekResults.push({
            level: "week",
            timeValue: `W${format(wDate, 'w')}-${getYear(wDate)}`,
            targetValue: wVal,
            startDate: format(wDate, 'yyyy-MM-dd'),
            endDate: format(addWeeks(wDate, 1), 'yyyy-MM-dd'),
          });
        });

        monthResults.push({
          level: "month",
          timeValue: mLabel,
          targetValue: mVal,
          startDate: format(mStart, 'yyyy-MM-dd'),
          endDate: format(mEnd, 'yyyy-MM-dd'),
          children: weekResults
        });
      });

      results.push({
        level: "quarter",
        timeValue: qLabel,
        targetValue: qVal,
        startDate: format(qStart, 'yyyy-MM-dd'),
        endDate: format(qEnd, 'yyyy-MM-dd'),
        children: monthResults
      });
    });
  } else if (durationType === "quarter") {
    // Quarter -> Months
    const months = eachMonthOfInterval({ start: actualStart, end: endDate });
    const perMonth = Math.floor(totalTarget / months.length);
    let remainder = totalTarget % months.length;

    months.forEach((mDate, index) => {
      const mVal = perMonth + (index < remainder ? 1 : 0);
      if (mVal <= 0) return;

      const mStart = isBefore(startOfMonth(mDate), actualStart) ? actualStart : startOfMonth(mDate);
      const mEnd = endOfMonth(mDate);
      const mLabel = `M${getMonth(mDate) + 1}-${getYear(mDate)}`;

      const weeks = eachWeekOfInterval({ start: mStart, end: mEnd }, { weekStartsOn: 1 });
      const perWeek = Math.floor(mVal / weeks.length);
      let wRemainder = mVal % weeks.length;

      const weekResults: DecompositionResult[] = [];
      weeks.forEach((wDate, wIndex) => {
        const wVal = perWeek + (wIndex < wRemainder ? 1 : 0);
        if (wVal <= 0) return;
        weekResults.push({
          level: "week",
          timeValue: `W${format(wDate, 'w')}-${getYear(wDate)}`,
          targetValue: wVal,
          startDate: format(wDate, 'yyyy-MM-dd'),
          endDate: format(addWeeks(wDate, 1), 'yyyy-MM-dd'),
        });
      });

      results.push({
        level: "month",
        timeValue: mLabel,
        targetValue: mVal,
        startDate: format(mStart, 'yyyy-MM-dd'),
        endDate: format(mEnd, 'yyyy-MM-dd'),
        children: weekResults
      });
    });
  } else {
    // Month -> Weeks
    const weeks = eachWeekOfInterval({ start: actualStart, end: endDate }, { weekStartsOn: 1 });
    const perWeek = Math.floor(totalTarget / weeks.length);
    let remainder = totalTarget % weeks.length;

    weeks.forEach((wDate, index) => {
      const wVal = perWeek + (index < remainder ? 1 : 0);
      if (wVal <= 0) return;
      results.push({
        level: "week",
        timeValue: `W${format(wDate, 'w')}-${getYear(wDate)}`,
        targetValue: wVal,
        startDate: format(wDate, 'yyyy-MM-dd'),
        endDate: format(addWeeks(wDate, 1), 'yyyy-MM-dd'),
      });
    });
  }

  return results;
}
