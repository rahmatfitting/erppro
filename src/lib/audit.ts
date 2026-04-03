export function getChanges(oldData: any, newData: any, fieldLabels: Record<string, string>): string {
  const changes: string[] = [];
  
  for (const key in fieldLabels) {
    let oldVal = oldData[key];
    let newVal = newData[key];
    
    // Normalize dates for comparison (assume YYYY-MM-DD or ISO string)
    if (oldVal instanceof Date) {
      oldVal = oldVal.toISOString().split('T')[0];
    } else if (typeof oldVal === 'string' && oldVal.includes('T')) {
      // Check if it's an ISO string and extract date part
      const d = new Date(oldVal);
      if (!isNaN(d.getTime())) oldVal = d.toISOString().split('T')[0];
    }

    if (newVal instanceof Date) {
      newVal = newVal.toISOString().split('T')[0];
    } else if (typeof newVal === 'string' && newVal.includes('T')) {
      const d = new Date(newVal);
      if (!isNaN(d.getTime())) newVal = d.toISOString().split('T')[0];
    }
    
    // Normalize null/undefined
    const o = oldVal === null || oldVal === undefined ? '' : String(oldVal).trim();
    const n = newVal === null || newVal === undefined ? '' : String(newVal).trim();

    if (o !== n) {
      changes.push(`${fieldLabels[key]}: "${o || '-'}" menjadi "${n || '-'}"`);
    }
  }
  
  if (changes.length > 0) {
    return `Mengubah data (${changes.join(', ')})`;
  }
  
  return "Mengubah data (Item/Detail)";
}
