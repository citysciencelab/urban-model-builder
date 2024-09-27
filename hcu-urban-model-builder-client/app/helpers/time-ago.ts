import { helper } from '@ember/component/helper';
import { DateTime } from 'luxon';

const units = ['year', 'month', 'week', 'day', 'hour', 'minute', 'second'];

const _timeAgo = (date: Date, locale: string) => {
  const dateTime = DateTime.fromISO(date.toISOString());
  const diff = dateTime.diffNow().shiftTo(...units);
  const unit = units.find((unit) => diff.get(unit) !== 0) || 'second';

  const relativeFormatter = new Intl.RelativeTimeFormat(locale, {
    numeric: 'auto',
  });
  return relativeFormatter.format(Math.trunc(diff.as(unit)), unit);
};

export default helper(function timeAgo(
  [locale, date]: [string, Date] /*, named*/,
) {
  if (!locale || !date) {
    throw new Error("Missing required arguments 'locale' and 'date'");
  }
  const lang = locale.split('-')[0];
  if (!lang) {
    throw new Error(
      `Invalid locale: ${locale}, needs to be something like en-US`,
    );
  }
  return _timeAgo(date as Date, lang);
});
