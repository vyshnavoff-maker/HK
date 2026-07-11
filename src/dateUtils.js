// Returns today's date as YYYY-MM-DD in the LOCAL timezone (not UTC).
// Using toISOString() alone is wrong here — it converts to UTC first,
// which shows the wrong day for anyone in a timezone ahead of UTC
// (like Dubai, UTC+4) during the first few hours after midnight.
export function todayLocal() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function currentMonthLocal() {
  return todayLocal().slice(0, 7)
}
