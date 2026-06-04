export function isStoreOpen(
  jamOperasional: string,
  isManualOpen: boolean = true
): { isOpen: boolean; message: string } {
  if (!isManualOpen) return { isOpen: false, message: 'Kedai sedang tutup sementara.' }
  
  const timeRegex = /(\d{1,2})[.:](\d{2})\s*[-–]\s*(\d{1,2})[.:](\d{2})/;
  const match = jamOperasional.match(timeRegex);
  
  let startHour = 10;
  let startMin = 0;
  let endHour = 21;
  let endMin = 0;
  
  if (match) {
    startHour = parseInt(match[1], 10);
    startMin = parseInt(match[2], 10);
    endHour = parseInt(match[3], 10);
    endMin = parseInt(match[4], 10);
  }

  // Get current time in WIB (UTC+7)
  const now = new Date();
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23'
  });
  
  const parts = formatter.formatToParts(now);
  const currentHourStr = parts.find(p => p.type === 'hour')?.value || '0';
  const currentMinStr = parts.find(p => p.type === 'minute')?.value || '0';
  
  const currentHour = parseInt(currentHourStr, 10);
  const currentMin = parseInt(currentMinStr, 10);
  
  const currentTotalMins = currentHour * 60 + currentMin;
  const startTotalMins = startHour * 60 + startMin;
  const endTotalMins = endHour * 60 + endMin;
  
  if (currentTotalMins >= startTotalMins && currentTotalMins <= endTotalMins) {
    return { isOpen: true, message: '' };
  } else {
    return { 
      isOpen: false, 
      message: `Kedai tutup. Buka kembali pukul ${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')} WIB.` 
    };
  }
}
