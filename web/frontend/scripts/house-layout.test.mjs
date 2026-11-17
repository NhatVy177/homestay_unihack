import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBranchLayout, roomFloor } from '../src/pages/homeExperience/houseLayout.js';

test('display number takes precedence over branch-based IDs; explicit floor takes precedence over name', () => {
  assert.equal(roomFloor({ MaPhong: 'P306', TenPhong: 'Phòng P203' }), 2);
  assert.equal(roomFloor({ maPhong: 'P104', tenPhong: 'Phòng P401' }), 4);
  assert.equal(roomFloor({ Tang: 0, TenPhong: 'Phòng P401' }), 0);
  assert.equal(roomFloor({ tang: '3', TenPhong: 'Phòng P401' }), 3);
  assert.equal(roomFloor({ TenPhong: 'P1001' }), 10);
  assert.equal(roomFloor({ MaPhong: 'P941', TenPhong: 'Phòng thử hoàn cọc' }), null);
  assert.equal(roomFloor({ Tang: '', TenPhong: 'Chưa đánh số' }), null);
});

test('each branch keeps its own complete floors and rooms, including empty intermediate floors', () => {
  const rooms = [
    { MaPhong: 'P104', TenPhong: 'Phòng P201' },
    { MaPhong: 'P101', TenPhong: 'Phòng P101' },
    ...Array.from({ length: 6 }, (_, i) => ({ MaPhong: `P40${i}`, TenPhong: `Phòng P40${i + 1}` })),
    { MaPhong: 'P928', TenPhong: 'Phòng thử hoàn cọc' },
  ];
  const layout = buildBranchLayout([...rooms, rooms[0]]);
  assert.equal(layout.floorCount, 4);
  assert.deepEqual(layout.floors.map(floor => floor.rooms.length), [1, 1, 0, 6]);
  assert.equal(layout.roomCount, 9);
  assert.equal(layout.modeledRoomCount, 8);
  assert.equal(layout.unassigned.length, 1);
  assert.equal(layout.columns * layout.rows >= 6, true);
  const otherBranch = buildBranchLayout([{ MaPhong: 'P301', TenPhong: 'Phòng P101' }]);
  assert.equal(otherBranch.floorCount, 1);
  assert.equal(otherBranch.roomCount, 1);
});

test('unknown/empty inventories never manufacture a default two-floor house', () => {
  for (const rooms of [[], [{ MaPhong: 'P999', TenPhong: 'Phòng thử chưa rõ tầng' }]]) {
    const layout = buildBranchLayout(rooms);
    assert.equal(layout.floorCount, 0);
    assert.equal(layout.modeledRoomCount, 0);
    assert.equal(layout.unassigned.length, rooms.length);
  }
});
