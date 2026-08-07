/**
 * The calendar date as the *user* sees it.
 *
 * Everything the app logs is stamped with "today", and every one of those stamps was built
 * with `new Date().toISOString().split('T')[0]`. `toISOString` is UTC. For anyone east of
 * Greenwich that means an entry logged after midnight but before the offset — 00:30 in
 * Spain, an hour or two either side depending on DST — was recorded against *yesterday*.
 * West of Greenwich the same bug runs the other way: a late-evening entry lands on
 * tomorrow.
 *
 * For an app whose entire model is "what did you do today", that is silent corruption of
 * the only column that matters. Reading the local calendar fields is the fix; there is no
 * case in this app where a UTC date is the right answer, because the backend stores and
 * compares these as plain `YYYY-MM-DD` strings with no zone attached.
 */
export function toLocalIsoDate(value: Date = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
