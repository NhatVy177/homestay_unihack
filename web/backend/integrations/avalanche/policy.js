// One text definition for the deposit slip, email and handover snapshot.
export function policyText(rules) {
  return ['Chính sách hoàn cọc HomeStayDorm áp dụng cho hợp đồng này:',
    ...rules.map(r => `- ${r.TenQuyDinh}: hoàn ${Number(r.TyLeHoanCoc)}% tiền cọc.`),
    '- Các khoản tiền thuê/dịch vụ còn nợ, chi phí sửa chữa hư hỏng do khách gây ra và tiền phạt (nếu có) được trừ vào tiền cọc khi đối soát trả phòng.',
    '- Hư hỏng đã ghi trong biên bản bàn giao lúc nhận phòng không được tính cho khách khi trả phòng.'].join('\n');
}
