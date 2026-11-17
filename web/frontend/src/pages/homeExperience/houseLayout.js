// A room's display number describes its floor; its database ID may describe a branch.
export function roomFloor(room) {
  const explicit = room.Tang ?? room.tang;
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') {
    const floor = Number(explicit);
    if (Number.isInteger(floor) && floor >= 0 && floor <= 99) return floor;
  }
  const name = String(room.TenPhong || room.tenPhong || '').trim();
  const number = name
    ? name.match(/\bP(\d{3,4})\b/i)?.[1]
    : String(room.MaPhong || room.maPhong || room.id || '').match(/^P(\d{3,4})$/i)?.[1];
  return number ? Math.floor(Number(number) / 100) : null;
}

export const floorName = number => number === 0 ? 'Tầng trệt' : `Tầng ${number}`;

export function buildBranchLayout(rooms = []) {
  const unique = new Map();
  for (const room of rooms) {
    const id = room.MaPhong || room.maPhong || room.id;
    if (id) unique.set(id, room);
  }
  const ordered = [...unique.values()].sort((a, b) =>
    String(a.TenPhong || a.tenPhong || '').localeCompare(String(b.TenPhong || b.tenPhong || ''), 'vi', { numeric: true }));
  const byFloor = new Map();
  const unassigned = [];
  for (const room of ordered) {
    const number = roomFloor(room);
    if (number === null) unassigned.push(room);
    else {
      if (!byFloor.has(number)) byFloor.set(number, []);
      byFloor.get(number).push(room);
    }
  }
  const first = byFloor.has(0) ? 0 : 1;
  const last = byFloor.size ? Math.max(...byFloor.keys()) : first - 1;
  const floors = Array.from({ length: last - first + 1 }, (_, i) => ({
    number: first + i, name: floorName(first + i), rooms: byFloor.get(first + i) || [],
  }));
  const columns = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, ...floors.map(floor => floor.rooms.length)))));
  const rows = Math.max(1, Math.ceil(Math.max(1, ...floors.map(floor => floor.rooms.length)) / columns));
  return { floors, unassigned, roomCount: ordered.length, modeledRoomCount: ordered.length - unassigned.length,
    floorCount: floors.length, columns, rows, width: columns * 1.7 + .4, depth: rows * 2.2 + .4 };
}
