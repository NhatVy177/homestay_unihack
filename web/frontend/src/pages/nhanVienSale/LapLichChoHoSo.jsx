import React, { useEffect, useMemo, useState } from 'react';
import SaleBookingView from './SaleBookingView.jsx';
import { lichXemPhongApi } from '../lichXemPhong/lichXemPhong.api.js';

function formatMoney(value) {
  const number = Number(value || 0);
  if (!number) return '';
  const vnd = Math.round(number);
  const remainder = ((vnd % 1000) + 1000) % 1000;
  const normalized = remainder <= 10
    ? vnd - remainder
    : 1000 - remainder <= 10
      ? vnd + (1000 - remainder)
      : vnd;
  return normalized.toLocaleString('vi-VN') + 'đ';
}

function formatGender(profile = {}) {
  const soNam = Number(profile.soNam || 0);
  const soNu = Number(profile.soNu || 0);
  if (soNam > 0 && soNu > 0) return `Khác (Nam: ${soNam}, Nữ: ${soNu})`;
  if (soNu > 0) return 'Nữ';
  if (soNam > 0) return 'Nam';
  return profile.gioiTinh || 'Không xác định';
}

function normalizeRooms(payload) {
  const rows = Array.isArray(payload) ? payload : (payload?.rooms || []);
  const map = new Map();

  rows.forEach((room) => {
    const id = room.maPhong || room.id;
    if (!id) return;

    if (!map.has(id)) {
      map.set(id, {
        ...room,
        maPhong: id,
        tenPhong: room.tenPhong || room.name || id,
        loaiPhong: room.loaiPhong || room.type || room.loaiThue,
        giaThue: room.giaThue ?? room.price,
        diaChi: room.diaChi || room.address,
        urlImg: room.urlImg || room.img,
        tinhTrang: room.tinhTrang || room.status,
        danhSachGiuong: []
      });
    }

    if (room.maGiuong) {
      const current = map.get(id);
      current.danhSachGiuong.push(room.maGiuong);
    }
  });

  return [...map.values()];
}

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('vi-VN');
}

function getAvailableSlots(room) {
  return Math.max(0, Number(room.soGiuongTrong ?? room.soGiuongDuKienXep ?? room.sucChua ?? 0));
}

function getRoomCapacity(room) {
  return Math.max(0, Number(room.sucChua ?? room.SucChuaToiDa ?? room.capacity ?? 0));
}

function isWholeRoomOption(room) {
  return ['nguyên căn', 'nguyên phòng'].includes(normalizeText(room.loaiThue));
}

function getTomorrowDateInputValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function formatGenderSlotText(male, female) {
  const parts = [];
  if (male > 0) parts.push(`${male} nam`);
  if (female > 0) parts.push(`${female} nữ`);
  return parts.join(' và ');
}

function roomAllowsMixedGender(room) {
  return ['không phân biệt', 'khác', 'hỗn hợp'].includes(normalizeText(room.gioiTinhChoPhep));
}

function roomAllowsSingleGender(room, gender) {
  const roomGender = normalizeText(room.gioiTinhChoPhep);
  return roomGender === gender || roomAllowsMixedGender(room);
}

function isRoomSuitableForProfile(room, profile) {
  const total = Math.max(1, Number(profile?.soNguoiO || profile?.soNguoiDuKienO || 1));
  const male = Math.max(0, Number(profile?.soNam || 0));
  const female = Math.max(0, Number(profile?.soNu || 0));
  const availableSlots = getAvailableSlots(room);
  const capacity = getRoomCapacity(room);

  if (male > 0 && female > 0) {
    return roomAllowsMixedGender(room)
      && capacity >= total
      && availableSlots >= capacity;
  }

  if (male > 0) {
    return roomAllowsSingleGender(room, 'nam') && availableSlots >= total;
  }

  if (female > 0) {
    return roomAllowsSingleGender(room, 'nữ') && availableSlots >= total;
  }

  return availableSlots >= total;
}

function evaluateRoomSelection(selectedRooms, profile) {
  const total = Math.max(1, Number(profile?.soNguoiO || profile?.soNguoiDuKienO || 1));
  const male = Math.max(0, Number(profile?.soNam || 0));
  const female = Math.max(0, Number(profile?.soNu || 0));

  if (selectedRooms.length === 0) {
    return {
      valid: false,
      mode: '',
      message: 'Vui lòng chọn ít nhất một phòng để lập lịch xem.'
    };
  }

  const invalidRooms = selectedRooms.filter((room) => !isRoomSuitableForProfile(room, profile));
  if (invalidRooms.length > 0) {
    const genderSlotText = male > 0 && female > 0 ? formatGenderSlotText(male, female) : `${total} người`;
    return {
      valid: false,
      mode: '',
      message: `Mỗi phòng được chọn phải tự đủ điều kiện cho ${genderSlotText}.`
    };
  }

  return {
    valid: true,
    mode: male > 0 && female > 0 ? 'Nguyên phòng' : 'Phòng phù hợp',
    message: male > 0 && female > 0
      ? `Đã chọn ${selectedRooms.length} phòng trống nguyên phòng phù hợp cho nhóm ${formatGenderSlotText(male, female)}.`
      : `Đã chọn ${selectedRooms.length} phòng phù hợp, mỗi phòng đủ ${total} chỗ.`
  };
}

export default function LapLichChoHoSo({ profile, onBack, onCreated }) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [regionValid, setRegionValid] = useState(true);
  const [roomError, setRoomError] = useState('');
  const [step, setStep] = useState('rooms');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formNote, setFormNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdSchedule, setCreatedSchedule] = useState(null);

  useEffect(() => {
    if (!profile?.maDangKy) return;

    setLoadingRooms(true);
    setRoomError('');
    setRooms([]);
    setSelectedRoomIds([]);
    setStep('rooms');

    lichXemPhongApi.getPhongPhuHop(profile.maDangKy)
      .then((res) => {
        const payload = res.data;
        const list = normalizeRooms(payload);
        setRooms(list);
        setRegionValid(payload?.isRegionValid ?? !payload?.khongCoChiNhanhPhuHop);
      })
      .catch((err) => {
        setRoomError(err.response?.data?.message || err.message || 'Không thể tải danh sách phòng phù hợp.');
      })
      .finally(() => setLoadingRooms(false));
  }, [profile?.maDangKy]);

  const selectedRooms = useMemo(
    () => rooms.filter((room) => selectedRoomIds.includes(room.maPhong)),
    [rooms, selectedRoomIds]
  );
  const selectionPlan = useMemo(
    () => evaluateRoomSelection(selectedRooms, profile),
    [selectedRooms, profile]
  );
  const minScheduleDate = useMemo(() => getTomorrowDateInputValue(), []);

  const toggleRoom = (roomId) => {
    setSelectedRoomIds((current) => (
      current.includes(roomId)
        ? current.filter((id) => id !== roomId)
        : [...current, roomId]
    ));
  };

  const handleCreateSchedule = async () => {
    if (!formDate || !formTime || !selectionPlan.valid) return;
    if (formDate < minScheduleDate) {
      alert('Ngày xem phòng phải sau ngày hiện tại.');
      return;
    }
    if (formTime < '07:00' || formTime > '17:00') {
      alert('Giờ xem phòng chỉ được chọn từ 07:00 đến 17:00.');
      return;
    }

    setSaving(true);
    try {
      const res = await lichXemPhongApi.create({
        maDangKy: profile.maDangKy,
        khachHangId: profile.maKhachHang,
        rooms: selectedRooms.map((room) => ({ maPhong: room.maPhong })),
        thoiGianXem: `${formDate}T${formTime}:00`,
        ghiChu: formNote || null
      });
      setCreatedSchedule(res.data);
      if (onCreated) onCreated(res.data);
    } catch (err) {
      alert('Lỗi khi lập lịch xem phòng: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  return <SaleBookingView {...{profile,onBack,rooms,selectedRoomIds,selectedRooms,loadingRooms,regionValid,roomError,step,setStep,formDate,setFormDate,formTime,setFormTime,formNote,setFormNote,saving,createdSchedule,selectionPlan,minScheduleDate,toggleRoom,handleCreateSchedule,formatMoney,formatGender,getAvailableSlots,isWholeRoomOption}} />;
}
