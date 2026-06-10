import dayjs from 'dayjs'
import 'dayjs/locale/id'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// Configure plugins
dayjs.extend(relativeTime)
dayjs.extend(timezone)
dayjs.extend(utc)
dayjs.extend(customParseFormat)

// Set default locale and timezone
dayjs.locale('id')
dayjs.tz.setDefault('Asia/Jakarta')

export { dayjs }
